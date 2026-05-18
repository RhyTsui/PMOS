import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, "docs", "export");
const outputPath = path.join(outputDir, "Dataki-v1.1-最新需求与设计图合集.docx");

const imageSpecs = [
  {
    title: "P01 登录页整页方案 A",
    note: "可直接参考。已包含 Dataki 品牌和小闪登录主入口。",
    relPath: "docs/design-review/ig_0789713ef89f4fe90169ea28235a048191aca44d7adcad7d16.png",
  },
  {
    title: "P02 首页 / 主入口整页方案 A",
    note: "仅作探索参考。改动较重，超过当前轻品牌替换边界。",
    relPath: "docs/design-review/ig_0789713ef89f4fe90169ea2869dbe08191b1051fe94a5666ec.png",
  },
  {
    title: "C01 登录页轻品牌版",
    note: "可直接参考。保留分栏壳体，只做品牌与视觉调整。",
    relPath: "docs/design-review/change-points/ig_0789713ef89f4fe90169ea3675e6d88191b03b435695400651.png",
  },
  {
    title: "C02 对话首页 / 主入口改动图",
    note: "需收敛后使用。建议只参考品牌语义和组件风格。",
    relPath: "docs/design-review/change-points/ig_0789713ef89f4fe90169ea36c6f3848191a2c42537e87da066.png",
  },
  {
    title: "S01 对话详情页 + 来源与参考侧栏",
    note: "可直接参考。适合作为引用来源与可引用状态的表达基线。",
    relPath: "docs/design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9efaabf88191ac67f6768c99edd9.png",
  },
  {
    title: "S02 知识详情右侧抽屉",
    note: "可直接参考。适合作为知识详情、共享范围、来源说明、权限说明抽屉。",
    relPath: "docs/design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9ec6026081918b932d24f6bea8e8.png",
  },
  {
    title: "S03 已共享对象总表弹窗",
    note: "可直接参考。适合作为共享对象列表与权限管理弹层。",
    relPath: "docs/design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9e8bb1208191819178ba84381fee.png",
  },
  {
    title: "S04 选择小闪用户弹窗",
    note: "可直接参考。适合作为共享给用户的选择器弹窗。",
    relPath: "docs/design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9e540bd0819185394e7da8b6eb64.png",
  },
  {
    title: "S05 分享知识主弹窗",
    note: "可直接参考。适合作为设置共享对象与权限等级的主弹窗。",
    relPath: "docs/design-review/sharing-change-points/ig_0789713ef89f4fe90169ea9e1ed6d881918cfad3e723ac22b3.png",
  },
];

const content = [
  { type: "title", text: "Dataki v1.1 最新需求与设计图合集" },
  { type: "meta", text: "版本：v1.1" },
  { type: "meta", text: "日期：2026-04-24" },
  { type: "meta", text: "状态：Current" },
  { type: "blank" },
  { type: "h1", text: "1. 当前版本定位" },
  { type: "p", text: "Dataki v1.1 当前只聚焦品牌改造与权限改造两条主线，先完成 Dataki 首版闭环。" },
  { type: "bullet", text: "对外定位文案统一为 LLM-wiki-Agent-MCP-Prompts。" },
  { type: "bullet", text: "当前版本是业务工作台首版，不是平台化完整版。" },
  { type: "bullet", text: "当前版本优先解决内部使用闭环，不承担平台外延目标。" },
  { type: "bullet", text: "当前版本成功标准是场景闭环，不是能力求全。" },
  { type: "blank" },
  { type: "h1", text: "2. 当前版本总原则" },
  { type: "bullet", text: "基本保留 WeKnora 产品壳。" },
  { type: "bullet", text: "只做轻品牌替换与必要范围收敛。" },
  { type: "bullet", text: "不做大规模首页、导航、产品结构重设计。" },
  { type: "bullet", text: "所有改动先出图、再确认、再开发。" },
  { type: "blank" },
  { type: "h1", text: "3. 已确认必做项" },
  { type: "h2", text: "3.1 品牌与前台" },
  { type: "bullet", text: "产品名统一为 Dataki。" },
  { type: "bullet", text: "Slogan 统一为 让知识与数据相遇。" },
  { type: "bullet", text: "当前版本主文案改为 LLM-wiki-Agent-MCP-Prompts。" },
  { type: "bullet", text: "替换 Logo、必要文案、必要色彩语义。" },
  { type: "bullet", text: "保留 WeKnora 现有主要页面结构和产品壳。" },
  { type: "bullet", text: "当前版本不按深接管 Dataki 工作台路线推进。" },
  { type: "h2", text: "3.2 知识范围" },
  { type: "bullet", text: "个人知识库。" },
  { type: "bullet", text: "部门知识库。" },
  { type: "bullet", text: "公司知识库。" },
  { type: "h2", text: "3.3 账号与登录" },
  { type: "bullet", text: "首个注册用户自动成为超管。" },
  { type: "bullet", text: "普通用户默认走小闪登录。" },
  { type: "bullet", text: "登录页必须保留小闪登录主入口。" },
  { type: "bullet", text: "登录页不能退化成只支持扫码 / 手机号双态。" },
  { type: "bullet", text: "登录容器需要预留企业登录扩展位。" },
  { type: "h2", text: "3.4 用户与组织" },
  { type: "bullet", text: "用户和组织信息以小闪返回为准。" },
  { type: "bullet", text: "组织层级至少覆盖小组 / 部门 / 公司 / 集团。" },
  { type: "bullet", text: "当前版本不另起一套并行组织树。" },
  { type: "h2", text: "3.5 知识使用规则" },
  { type: "bullet", text: "个人知识库默认私有，可分享给人或空间，可挂主对话框。" },
  { type: "bullet", text: "部门知识库由部门管理员维护，可供部门成员使用，可挂指定业务 Chat。" },
  { type: "bullet", text: "公司知识库由指定负责人维护，可供公司内部检索，可挂指定 AI 应用，开放范围必须受控。" },
  { type: "h2", text: "3.6 模型与 MCP" },
  { type: "bullet", text: "模型仅支持超管配置。" },
  { type: "bullet", text: "普通用户只使用系统内置模型。" },
  { type: "bullet", text: "前台只展示模型名称。" },
  { type: "bullet", text: "默认内置数据部大模型、知识库和数据 MCP 服务。" },
  { type: "blank" },
  { type: "h1", text: "4. 当前版本明确不做" },
  { type: "bullet", text: "提示词资产建设。" },
  { type: "bullet", text: "权限中心与统一平台能力整合。" },
  { type: "bullet", text: "发布、版本、评测能力建设。" },
  { type: "bullet", text: "普通用户自定义模型配置。" },
  { type: "bullet", text: "非小闪体系的用户管理体系重做。" },
  { type: "bullet", text: "与更多外部身份源并行接入。" },
  { type: "bullet", text: "大规模重做 WeKnora 前台产品结构。" },
  { type: "bullet", text: "大规模重新设计 WeKnora 底层文档解析与检索链路。" },
  { type: "blank" },
  { type: "h1", text: "5. 当前版本页面范围" },
  { type: "bullet", text: "P0：登录页、首次超管注册页、主对话框首页、会话详情页、知识资产列表页、知识库详情页、新建 / 编辑知识库页、分享与挂载弹层。" },
  { type: "bullet", text: "P1：MCP 管理页、组织映射页、超管系统配置页。" },
  { type: "blank" },
  { type: "h1", text: "6. 设计图合集" },
  { type: "p", text: "以下图片按当前版本口径整理。可直接参考的图优先放前，探索性较强的图仅作表达参考。" },
];

function xmlEscape(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function paragraph(text, opts = {}) {
  const size = opts.size ?? 24;
  const bold = opts.bold ? "<w:b/>" : "";
  const spacingBefore = opts.before ?? 0;
  const spacingAfter = opts.after ?? 120;
  const indent = opts.indent ?? 0;
  return `<w:p><w:pPr>${opts.style ? `<w:pStyle w:val="${opts.style}"/>` : ""}<w:spacing w:before="${spacingBefore}" w:after="${spacingAfter}"/>${indent ? `<w:ind w:left="${indent}"/>` : ""}</w:pPr><w:r><w:rPr>${bold}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function imageParagraph(rId, cx, cy, name) {
  return `<w:p>
    <w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0"
          xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
          xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
          xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <wp:extent cx="${cx}" cy="${cy}"/>
          <wp:docPr id="${Math.floor(Math.random() * 100000)}" name="${xmlEscape(name)}"/>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="0" name="${xmlEscape(name)}"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${rId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>`;
}

function pngSize(buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG") {
    throw new Error("Only PNG is supported");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const zip = new JSZip();
  const relationships = [];
  const body = [];

  for (const item of content) {
    if (item.type === "title") body.push(paragraph(item.text, { size: 36, bold: true, after: 240 }));
    if (item.type === "meta") body.push(paragraph(item.text, { size: 20, after: 40 }));
    if (item.type === "h1") body.push(paragraph(item.text, { size: 28, bold: true, before: 240, after: 120 }));
    if (item.type === "h2") body.push(paragraph(item.text, { size: 24, bold: true, before: 160, after: 80 }));
    if (item.type === "p") body.push(paragraph(item.text, { size: 22, after: 100 }));
    if (item.type === "bullet") body.push(paragraph(`• ${item.text}`, { size: 22, indent: 240, after: 60 }));
    if (item.type === "blank") body.push(paragraph("", { size: 20, after: 40 }));
  }

  for (let i = 0; i < imageSpecs.length; i += 1) {
    const spec = imageSpecs[i];
    const absPath = path.join(projectRoot, spec.relPath);
    const buffer = await fs.readFile(absPath);
    const { width, height } = pngSize(buffer);
    const maxCx = 5300000;
    let cx = width * 9525;
    let cy = height * 9525;
    if (cx > maxCx) {
      cy = Math.round((cy * maxCx) / cx);
      cx = maxCx;
    }

    const imageName = path.basename(spec.relPath);
    const mediaPath = `word/media/${imageName}`;
    const relId = `rId${relationships.length + 1}`;

    zip.file(mediaPath, buffer);
    relationships.push({
      id: relId,
      target: `media/${imageName}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
    });

    body.push(paragraph(spec.title, { size: 24, bold: true, before: 240, after: 80 }));
    body.push(paragraph(spec.note, { size: 20, after: 80 }));
    body.push(imageParagraph(relId, cx, cy, spec.title));
    body.push(paragraph("", { size: 20, after: 80 }));
  }

  const sectPr = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1040" w:bottom="1440" w:left="1040" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${body.join("")}
    ${sectPr}
  </w:body>
</w:document>`
  );

  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relationships
    .map(
      (rel) =>
        `<Relationship Id="${rel.id}" Type="${rel.type}" Target="${rel.target}"/>`
    )
    .join("")}
</Relationships>`
  );

  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Microsoft YaHei" w:hAnsi="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:cs="Microsoft YaHei"/>
        <w:lang w:val="zh-CN" w:eastAsia="zh-CN" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(outputPath, buffer);
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
