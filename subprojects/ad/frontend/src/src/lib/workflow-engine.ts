import { assign, createMachine, createActor } from 'xstate';
import type { RequestRouteDecision as IntentRouteDecision } from '@/lib/request-understanding';
import type { WorkflowRunRecord, WorkflowStepRecord } from './workflow-task-store';

export type WorkflowPhase = 'received' | 'routed' | 'clarifying' | 'executing' | 'blocked' | 'completed' | 'failed';

export interface WorkflowEngineContext {
  task_id: string;
  conversation_id?: string;
  intent_type: string;
  workflow_level: 'light' | 'heavy';
  phase: WorkflowPhase;
  route_reason?: string;
  steps: WorkflowStepRecord[];
  evidence_ids: string[];
  result_id?: string;
  last_error?: string;
}

type WorkflowEvent =
  | { type: 'route'; decision: IntentRouteDecision; route_reason?: string }
  | { type: 'clarify'; reason: string }
  | { type: 'execute' }
  | { type: 'step'; step: WorkflowStepRecord }
  | { type: 'block'; reason: string }
  | { type: 'complete'; result_id?: string }
  | { type: 'fail'; reason: string };

const workflowMachine = createMachine({
  id: 'xiaoqiao.workflow',
  types: {} as {
    context: WorkflowEngineContext;
    events: WorkflowEvent;
  },
  initial: 'received',
  context: {
    task_id: '',
    conversation_id: undefined,
    intent_type: 'general',
    workflow_level: 'light',
    phase: 'received',
    route_reason: undefined,
    steps: [],
    evidence_ids: [],
    result_id: undefined,
    last_error: undefined,
  },
  states: {
    received: {
      on: {
        route: {
          target: 'routed',
          actions: assign(({ event }) => ({
            intent_type: event.decision.intent_type,
            workflow_level: event.decision.workflow_level,
            route_reason: event.route_reason || event.decision.reason,
            phase: 'routed',
          })),
        },
      },
    },
    routed: {
      on: {
        clarify: {
          target: 'clarifying',
          actions: assign(({ event }) => ({ phase: 'clarifying', last_error: event.reason })),
        },
        execute: {
          target: 'executing',
          actions: assign({ phase: 'executing' }),
        },
        block: {
          target: 'blocked',
          actions: assign(({ event }) => ({ phase: 'blocked', last_error: event.reason })),
        },
      },
    },
    clarifying: {
      on: {
        execute: {
          target: 'executing',
          actions: assign({ phase: 'executing' }),
        },
        block: {
          target: 'blocked',
          actions: assign(({ event }) => ({ phase: 'blocked', last_error: event.reason })),
        },
      },
    },
    executing: {
      on: {
        step: {
          actions: assign(({ context, event }) => ({ steps: [...context.steps, event.step] })),
        },
        block: {
          target: 'blocked',
          actions: assign(({ event }) => ({ phase: 'blocked', last_error: event.reason })),
        },
        complete: {
          target: 'completed',
          actions: assign(({ event }) => ({ phase: 'completed', result_id: event.result_id })),
        },
        fail: {
          target: 'failed',
          actions: assign(({ event }) => ({ phase: 'failed', last_error: event.reason })),
        },
      },
    },
    blocked: {
      on: {
        execute: {
          target: 'executing',
          actions: assign({ phase: 'executing' }),
        },
      },
    },
    completed: {},
    failed: {},
  },
});

export interface WorkflowRuntime {
  actor: ReturnType<typeof createActor>;
  getSnapshot: () => WorkflowEngineContext;
  send: (event: WorkflowEvent) => void;
  toRunRecord: (taskId: string, conversationId?: string) => WorkflowRunRecord;
}

export function createWorkflowRuntime(input: {
  taskId: string;
  conversationId?: string;
  decision: IntentRouteDecision;
  routeReason?: string;
  traceId?: string;
}): WorkflowRuntime {
  const actor = createActor(workflowMachine, {
    input: {
      task_id: input.taskId,
      conversation_id: input.conversationId,
      intent_type: input.decision.intent_type,
      workflow_level: input.decision.workflow_level,
      phase: 'received',
      route_reason: input.routeReason || input.decision.reason,
      steps: [],
      evidence_ids: [],
      result_id: undefined,
      last_error: undefined,
    },
  });

  actor.start();
  actor.send({ type: 'route', decision: input.decision, route_reason: input.routeReason });

  return {
    actor,
    getSnapshot: () => actor.getSnapshot().context,
    send: (event) => actor.send(event),
    toRunRecord: (taskId, conversationId) => {
      const context = actor.getSnapshot().context;
      const status = context.phase === 'blocked'
        ? 'blocked'
        : context.phase === 'completed'
          ? 'completed'
          : context.phase === 'failed'
            ? 'failed'
            : context.phase === 'received' || context.phase === 'routed'
              ? 'running'
              : 'running';
      return {
        run_id: `run-${taskId}`,
        task_id: taskId,
        conversation_id: conversationId,
        intent_type: context.intent_type,
        workflow_level: context.workflow_level,
        state: context.phase,
        status,
        route_reason: context.route_reason,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: context.phase === 'completed' || context.phase === 'blocked' || context.phase === 'failed' ? new Date().toISOString() : undefined,
        steps: context.steps,
        trace_id: input.traceId,
        evidence_ids: context.evidence_ids,
        result_id: context.result_id,
        metadata: {
          decision: input.decision,
        },
      };
    },
  };
}
