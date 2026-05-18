$ErrorActionPreference = "Stop"

$xmlPath = "E:\AI\ai-os\subprojects\knowledge-base\docs\export\.tmp-dataki-v11-docx\word\document.xml"
[xml]$doc = Get-Content -LiteralPath $xmlPath -Raw -Encoding UTF8
$ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

function Get-ParagraphByText([string]$text) {
  $nodes = $doc.SelectNodes("//w:p", $ns)
  foreach ($n in $nodes) {
    if ($n.InnerText -eq $text) {
      return ([System.Xml.XmlElement]$n)
    }
  }
  throw "paragraph not found: $text"
}

function New-ParagraphNode(
  [string]$text,
  [int]$fontSize,
  [bool]$bold,
  [bool]$indented,
  [int]$before,
  [int]$after
) {
  $p = $doc.CreateElement("w", "p", $ns.LookupNamespace("w"))
  $pPr = $doc.CreateElement("w", "pPr", $ns.LookupNamespace("w"))
  $spacing = $doc.CreateElement("w", "spacing", $ns.LookupNamespace("w"))
  [void]$spacing.SetAttribute("before", $ns.LookupNamespace("w"), [string]$before)
  [void]$spacing.SetAttribute("after", $ns.LookupNamespace("w"), [string]$after)
  [void]$pPr.AppendChild($spacing)

  if ($indented) {
    $ind = $doc.CreateElement("w", "ind", $ns.LookupNamespace("w"))
    [void]$ind.SetAttribute("left", $ns.LookupNamespace("w"), "240")
    [void]$pPr.AppendChild($ind)
  }

  [void]$p.AppendChild($pPr)

  $r = $doc.CreateElement("w", "r", $ns.LookupNamespace("w"))
  $rPr = $doc.CreateElement("w", "rPr", $ns.LookupNamespace("w"))

  if ($bold) {
    [void]$rPr.AppendChild($doc.CreateElement("w", "b", $ns.LookupNamespace("w")))
  }

  $sz = $doc.CreateElement("w", "sz", $ns.LookupNamespace("w"))
  [void]$sz.SetAttribute("val", $ns.LookupNamespace("w"), [string]$fontSize)
  [void]$rPr.AppendChild($sz)

  $szCs = $doc.CreateElement("w", "szCs", $ns.LookupNamespace("w"))
  [void]$szCs.SetAttribute("val", $ns.LookupNamespace("w"), [string]$fontSize)
  [void]$rPr.AppendChild($szCs)

  [void]$r.AppendChild($rPr)

  $t = $doc.CreateElement("w", "t", $ns.LookupNamespace("w"))
  $xmlSpace = $doc.CreateAttribute("xml", "space", "http://www.w3.org/XML/1998/namespace")
  $xmlSpace.Value = "preserve"
  [void]$t.Attributes.Append($xmlSpace)
  $t.InnerText = $text
  [void]$r.AppendChild($t)

  [void]$p.AppendChild($r)
  return ([System.Xml.XmlElement]$p)
}

function InsertParagraphsAfter($anchor, $definitions) {
  $parent = $anchor.ParentNode
  $ref = $anchor.NextSibling

  foreach ($def in $definitions) {
    $node = New-ParagraphNode `
      -text $def.text `
      -fontSize $def.fontSize `
      -bold $def.bold `
      -indented $def.indented `
      -before $def.before `
      -after $def.after

    if ($ref -is [System.Xml.XmlNode]) {
      [void]$parent.InsertBefore($node, $ref)
    } else {
      [void]$parent.AppendChild($node)
    }
    $anchor = $node
  }
}

$brandAnchor = Get-ParagraphByText "• 替换 Logo、必要文案、必要色彩语义。"
InsertParagraphsAfter $brandAnchor @(
  @{ text = "• 登录页需补齐前端可切片交付说明，至少拆出 Logo、品牌标题、副标题、登录主按钮区、企业登录扩展位、背景插画 / 底纹层级。"; fontSize = 22; bold = $false; indented = $true; before = 0; after = 60 },
  @{ text = "• Logo 需提供前端可直接落地的切图或矢量源文件，并明确深浅背景版本、最小尺寸、留白和安全区规范。"; fontSize = 22; bold = $false; indented = $true; before = 0; after = 60 }
)

$loginAnchor = Get-ParagraphByText "• 登录容器需要预留企业登录扩展位。"
InsertParagraphsAfter $loginAnchor @(
  @{ text = "• 登录页视觉稿不能只停留整页图，需同步输出前端切片清单、资源命名规范和 1x / 2x 交付口径。"; fontSize = 22; bold = $false; indented = $true; before = 0; after = 60 }
)

$modelHeading = Get-ParagraphByText "3.6 模型与 MCP"
$modelHeading.SelectSingleNode(".//w:t", $ns).InnerText = "3.7 模型与 MCP"

$promptAnchor = Get-ParagraphByText "• 公司知识库由指定负责人维护，可供公司内部检索，可挂指定 AI 应用，开放范围必须受控。"
InsertParagraphsAfter $promptAnchor @(
  @{ text = "3.6 Prompt 知识资产管理"; fontSize = 24; bold = $true; indented = $false; before = 160; after = 80 },
  @{ text = "• v1.1 增加 Prompt 作为知识资产类型，挂在知识库菜单下统一管理，作为知识的一种进入 Dataki 资产体系。"; fontSize = 22; bold = $false; indented = $true; before = 0; after = 60 },
  @{ text = "• Prompt 资产至少支持列表、筛选、详情、新增、编辑、启停状态、版本说明与最近更新时间展示。"; fontSize = 22; bold = $false; indented = $true; before = 0; after = 60 },
  @{ text = "• Prompt 资产基础字段至少包含名称、用途说明、正文内容、变量说明、适用模型或场景、归属范围、负责人、状态。"; fontSize = 22; bold = $false; indented = $true; before = 0; after = 60 },
  @{ text = "• Prompt 资产需支持挂载到主对话框、指定业务 Chat 与外部 Agent；调用前必须经过绑定关系和权限校验。"; fontSize = 22; bold = $false; indented = $true; before = 0; after = 60 },
  @{ text = "• Prompt 资产沿用知识资产权限模型，至少区分查看、编辑、发布、绑定 / 调用四类权限，并记录调用主体。"; fontSize = 22; bold = $false; indented = $true; before = 0; after = 60 }
)

$notDo = Get-ParagraphByText "• 提示词资产建设。"
$notDo.SelectSingleNode(".//w:t", $ns).InnerText = "• 不做重型 Prompt 中台建设，但当前版本需支持 Prompt 作为知识资产被管理和调用。"

$pageRange = Get-ParagraphByText "• P0：登录页、首次超管注册页、主对话框首页、会话详情页、知识资产列表页、知识库详情页、新建 / 编辑知识库页、分享与挂载弹层。"
$pageRange.SelectSingleNode(".//w:t", $ns).InnerText = "• P0：登录页、首次超管注册页、主对话框首页、会话详情页、知识资产列表页、知识库详情页、新建 / 编辑知识库页、Prompt 资产列表页、Prompt 资产详情 / 编辑页、分享与挂载弹层。"

$doc.Save($xmlPath)
