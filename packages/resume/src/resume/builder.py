from __future__ import annotations

import importlib.resources
import io

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from lxml import etree


def build_resume(data: dict) -> bytes:
    pkg = importlib.resources.files("resume")
    tmpl_path = str(pkg / "template.docx")
    doc = Document(tmpl_path)

    body = doc.element.body
    sect_pr = body.find(qn("w:sectPr"))
    for child in list(body):
        body.remove(child)

    hdr = data["header"]
    _name(body, hdr["name"])
    _contact(body, hdr["phone"], hdr["email"], hdr["linkedin"])

    _section_hdr(body, "Education", before=111, line_v=238746, line_doc_id=1, line_sp_id=5)
    for edu in data["education"]:
        _education(body, edu)

    _section_hdr(body, "Relevant Experiences", before=111, line_v=248979, line_doc_id=2, line_sp_id=2)
    for exp in data["experience"]:
        _experience(body, exp)

    _section_hdr(body, "Projects", before=138)
    _proj_spacer(body)
    for proj in data["projects"]:
        _project(body, proj)

    _section_hdr(body, "Skills & Interests", before=138)
    for i, skill in enumerate(data["skills"]):
        _skill(body, skill, first=(i == 0))

    if sect_pr is not None:
        body.append(sect_pr)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ── paragraph builders ────────────────────────────────────────────────────────

def _name(body, name: str):
    p = _p()
    pp = _pPr(p)
    _e(pp, "w:widowControl", {"w:val": "true"})
    _e(pp, "w:pBdr")
    _e(pp, "w:spacing")
    _e(pp, "w:ind", {"w:firstLine": "720", "w:left": "2880"})
    _e(pp, "w:jc", {"w:val": "left"})
    rp = _e(pp, "w:rPr")
    _e(rp, "w:b"); _e(rp, "w:bCs")
    _e(rp, "w:sz", {"w:val": "50"}); _e(rp, "w:szCs", {"w:val": "50"})

    r = _r()
    rp2 = _e(r, "w:rPr")
    _e(rp2, "w:b"); _e(rp2, "w:bCs")
    _e(rp2, "w:sz", {"w:val": "50"}); _e(rp2, "w:szCs", {"w:val": "50"})
    _e(rp2, "w:rtl", {"w:val": "0"})
    _t(r, name.upper())
    p.append(r)
    body.append(p)


def _contact(body, phone: str, email: str, linkedin: str):
    p = _p()
    pp = _pPr(p)
    _e(pp, "w:widowControl", {"w:val": "true"})
    _e(pp, "w:pBdr")
    _e(pp, "w:spacing")
    _e(pp, "w:ind")
    _e(pp, "w:jc", {"w:val": "center"})
    rp = _e(pp, "w:rPr")
    _e(rp, "w:smallCaps")

    r = _r()
    rp2 = _e(r, "w:rPr")
    _e(rp2, "w:rtl", {"w:val": "0"})
    _t(r, f"{phone}   |   {email}   |   {linkedin}")
    p.append(r)
    body.append(p)


def _section_hdr(body, title: str, *, before: int,
                  line_v: int = 0, line_doc_id: int = 0, line_sp_id: int = 0):
    p = _p()
    pp = _pPr(p)
    _e(pp, "w:pBdr")
    _e(pp, "w:spacing", {"w:before": str(before)})
    _e(pp, "w:ind", {"w:firstLine": "0", "w:left": "12"})
    rp = _e(pp, "w:rPr")
    _e(rp, "w:b"); _e(rp, "w:bCs")
    _e(rp, "w:i"); _e(rp, "w:iCs")

    r = _r()
    rp2 = _e(r, "w:rPr")
    _e(rp2, "w:b"); _e(rp2, "w:bCs")
    _e(rp2, "w:i"); _e(rp2, "w:iCs")
    _e(rp2, "w:rtl", {"w:val": "0"})
    _t(r, title)
    p.append(r)

    if line_doc_id:
        r2 = _r()
        r2.append(_line_xml(line_v, line_doc_id, line_sp_id))
        p.append(r2)
        for _ in range(2):
            r3 = _r()
            rp3 = _e(r3, "w:rPr")
            _e(rp3, "w:b"); _e(rp3, "w:bCs")
            _e(rp3, "w:i"); _e(rp3, "w:iCs")
            p.append(r3)

    body.append(p)


def _education(body, edu: dict):
    # Row 1: institution, program (left) | Expected Graduation (right)
    p1 = _p()
    pp1 = _pPr(p1)
    _e(pp1, "w:pBdr")
    _e(_e(pp1, "w:tabs"), "w:tab", {"w:val": "right", "w:leader": "none", "w:pos": "9634"})
    _e(pp1, "w:spacing", {"w:before": "73", "w:line": "264", "w:lineRule": "auto"})
    _e(pp1, "w:ind", {"w:right": "9", "w:firstLine": "0", "w:left": "12"})
    _e(pp1, "w:rPr")

    _rn(p1, edu["institution"] + ", ", b=True, sz="24")
    r = _r()
    rp2 = _e(r, "w:rPr")
    _e(rp2, "w:i"); _e(rp2, "w:iCs")
    _e(rp2, "w:sz", {"w:val": "20"}); _e(rp2, "w:szCs", {"w:val": "20"})
    _e(rp2, "w:rtl", {"w:val": "0"})
    _t(r, edu["program"])
    _e(r, "w:tab")
    p1.append(r)
    _rn(p1, f"Expected Graduation: {edu['graduation']}", b=True)
    body.append(p1)

    # Row 2: Dual Degree: degree (left) | GPA (right)
    p2 = _p()
    pp2 = _pPr(p2)
    _e(pp2, "w:pBdr")
    _e(_e(pp2, "w:tabs"), "w:tab", {"w:val": "right", "w:leader": "none", "w:pos": "9634"})
    _e(pp2, "w:spacing", {"w:line": "264", "w:lineRule": "auto"})
    _e(pp2, "w:ind", {"w:right": "9", "w:firstLine": "0", "w:left": "12"})
    _e(pp2, "w:rPr")

    _rn(p2, "Dual Degree: ", b=True)
    _rn(p2, edu["degree"])
    r2 = _r()
    _e(r2, "w:rPr")
    _e(r2, "w:tab")
    p2.append(r2)
    _rn(p2, f"GPA: {edu['gpa']}", b=True)
    body.append(p2)

    # Coursework rows (one paragraph per group)
    for cg in edu.get("coursework", []):
        pc = _p()
        ppc = _pPr(pc)
        _e(ppc, "w:pBdr")
        _e(ppc, "w:spacing", {"w:line": "264", "w:lineRule": "auto"})
        _e(ppc, "w:ind", {"w:right": "9", "w:firstLine": "0", "w:left": "12"})
        _e(ppc, "w:rPr")
        _rn(pc, f"{cg['label']}:", b=True)
        for ci, course in enumerate(cg["courses"]):
            sep = " " if ci == 0 else ", "
            _rn(pc, f"{sep}{course['number']}")
            if course.get("name"):
                _rn(pc, f" ({course['name']})", i=True)
        for ei, course in enumerate(cg.get("expected", [])):
            _rn(pc, " Expected: " if ei == 0 else ", ", b=(ei == 0))
            _rn(pc, course["number"])
            if course.get("name"):
                _rn(pc, f" ({course['name']})", i=True)
        body.append(pc)


def _experience(body, exp: dict):
    p = _p()
    pp = _pPr(p)
    _e(pp, "w:pBdr")
    _e(_e(pp, "w:tabs"), "w:tab", {"w:val": "right", "w:leader": "none", "w:pos": "9634"})
    _e(pp, "w:spacing", {"w:before": "33"})
    _e(pp, "w:ind", {"w:firstLine": "0", "w:left": "12"})
    rp = _e(pp, "w:rPr")
    _e(rp, "w:b"); _e(rp, "w:bCs")

    _rn(p, exp["role"] + ", ", b=True, sz="24")

    r = _r()
    rp2 = _e(r, "w:rPr")
    _e(rp2, "w:i"); _e(rp2, "w:iCs")
    _e(rp2, "w:sz", {"w:val": "20"}); _e(rp2, "w:szCs", {"w:val": "20"})
    _e(rp2, "w:rtl", {"w:val": "0"})
    _t(r, exp["company"])
    _e(r, "w:tab")
    p.append(r)

    _rn(p, f"{exp['dates']} | {exp['location']}", b=True)
    body.append(p)

    for bullet in exp["bullets"]:
        _exp_bullet(body, bullet)


def _exp_bullet(body, text: str):
    p = _p()
    pp = _pPr(p)
    numPr = _e(pp, "w:numPr")
    _e(numPr, "w:ilvl", {"w:val": "0"})
    _e(numPr, "w:numId", {"w:val": "1"})
    _e(pp, "w:pBdr")
    tabs = _e(pp, "w:tabs")
    _e(tabs, "w:tab", {"w:val": "left", "w:leader": "none", "w:pos": "370"})
    _e(pp, "w:spacing", {"w:before": "33"})
    _e(pp, "w:ind", {"w:hanging": "190", "w:left": "370"})
    _e(pp, "w:rPr")
    _rn(p, text)
    body.append(p)


def _proj_spacer(body):
    p = _p()
    pp = _pPr(p)
    _e(pp, "w:pBdr")
    tabs = _e(pp, "w:tabs")
    _e(tabs, "w:tab", {"w:val": "left", "w:leader": "none", "w:pos": "8692"})
    _e(pp, "w:spacing")
    _e(pp, "w:ind", {"w:firstLine": "0", "w:left": "12"})
    rp = _e(pp, "w:rPr")
    _e(rp, "w:b"); _e(rp, "w:bCs")
    _e(rp, "w:sz", {"w:val": "6"}); _e(rp, "w:szCs", {"w:val": "6"})

    r1 = _r()
    _e(r1, "w:rPr")
    p.append(r1)

    r2 = _r()
    r2.append(_line_xml(17742, 3, 4))
    p.append(r2)

    for _ in range(2):
        r3 = _r()
        rp3 = _e(r3, "w:rPr")
        _e(rp3, "w:b"); _e(rp3, "w:bCs")
        _e(rp3, "w:sz", {"w:val": "6"}); _e(rp3, "w:szCs", {"w:val": "6"})
        p.append(r3)

    body.append(p)


def _project(body, proj: dict):
    p = _p()
    pp = _pPr(p)
    _e(pp, "w:pBdr")
    _e(_e(pp, "w:tabs"), "w:tab", {"w:val": "right", "w:leader": "none", "w:pos": "9634"})
    _e(pp, "w:spacing")
    _e(pp, "w:ind", {"w:firstLine": "0", "w:left": "12"})
    rp = _e(pp, "w:rPr")
    _e(rp, "w:b"); _e(rp, "w:bCs")

    r = _r()
    rp2 = _e(r, "w:rPr")
    _e(rp2, "w:b"); _e(rp2, "w:bCs")
    _e(rp2, "w:rtl", {"w:val": "0"})
    _t(r, proj["name"])
    _e(r, "w:tab")
    _t(r, proj["technologies"])
    p.append(r)
    body.append(p)

    bullets = proj["bullets"]
    for i, bullet in enumerate(bullets):
        _proj_bullet(body, bullet, i, len(bullets))


def _proj_bullet(body, text: str, idx: int, total: int):
    p = _p()
    pp = _pPr(p)
    numPr = _e(pp, "w:numPr")
    _e(numPr, "w:ilvl", {"w:val": "0"})
    _e(numPr, "w:numId", {"w:val": "3"})
    _e(pp, "w:pBdr")
    tabs = _e(pp, "w:tabs")
    _e(tabs, "w:tab", {"w:val": "left", "w:leader": "none", "w:pos": "185"})

    if idx == 0:
        _e(pp, "w:spacing", {"w:after": "0", "w:afterAutospacing": "0", "w:before": "18"})
    elif idx < total - 1:
        _e(pp, "w:spacing", {"w:after": "0", "w:afterAutospacing": "0",
                              "w:before": "0", "w:beforeAutospacing": "0"})
    else:
        _e(pp, "w:spacing", {"w:before": "0", "w:beforeAutospacing": "0"})

    _e(pp, "w:ind", {"w:right": "86", "w:hanging": "180", "w:left": "360"})
    _e(pp, "w:rPr")
    _rn(p, text)
    body.append(p)


def _skill(body, skill: dict, first: bool = False):
    p = _p()
    pp = _pPr(p)
    _e(pp, "w:pBdr")
    _e(pp, "w:spacing", {"w:before": "46" if first else "18"})
    _e(pp, "w:ind", {"w:firstLine": "0", "w:left": "12"})
    _e(pp, "w:rPr")

    _rn(p, f"{skill['category']}: ", b=True)
    _rn(p, skill["content"])

    if first:
        r = _r()
        r.append(_line_xml(17542, 4, 3))
        p.append(r)
        p.append(_r())

    body.append(p)


# ── XML primitives ────────────────────────────────────────────────────────────

def _p() -> etree._Element:
    return OxmlElement("w:p")


def _r() -> etree._Element:
    return OxmlElement("w:r")


def _pPr(p: etree._Element) -> etree._Element:
    pp = OxmlElement("w:pPr")
    p.insert(0, pp)
    return pp


def _e(parent: etree._Element, tag: str, attrib: dict = None) -> etree._Element:
    el = OxmlElement(tag)
    if attrib:
        for k, v in attrib.items():
            el.set(qn(k), v)
    parent.append(el)
    return el


def _t(r: etree._Element, text: str):
    t = OxmlElement("w:t")
    t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t.text = text
    r.append(t)


def _rn(p: etree._Element, text: str, *, b: bool = False, i: bool = False,
        sz: str = None) -> etree._Element:
    r = _r()
    rp = OxmlElement("w:rPr")
    if b:
        _e(rp, "w:b"); _e(rp, "w:bCs")
    if i:
        _e(rp, "w:i"); _e(rp, "w:iCs")
    if sz is not None:
        _e(rp, "w:sz", {"w:val": sz}); _e(rp, "w:szCs", {"w:val": sz})
    _e(rp, "w:rtl", {"w:val": "0"})
    r.append(rp)
    _t(r, text)
    p.append(r)
    return r


def _line_xml(v_offset: int, doc_id: int, sp_id: int) -> etree._Element:
    xml = (
        '<mc:AlternateContent'
        ' xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'
        ' xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
        ' xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"'
        ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'
        ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
        ' xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"'
        ' xmlns:v="urn:schemas-microsoft-com:vml"'
        ' xmlns:o="urn:schemas-microsoft-com:office:office">'
        '<mc:Choice Requires="wpg">'
        '<w:drawing>'
        f'<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0"'
        f' relativeHeight="0" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">'
        '<wp:simplePos x="0" y="0"/>'
        '<wp:positionH relativeFrom="column"><wp:posOffset>7620</wp:posOffset></wp:positionH>'
        f'<wp:positionV relativeFrom="paragraph"><wp:posOffset>{v_offset}</wp:posOffset></wp:positionV>'
        '<wp:extent cx="7132320" cy="10189"/>'
        '<wp:effectExtent l="0" t="0" r="0" b="0"/>'
        '<wp:wrapNone/>'
        f'<wp:docPr id="{doc_id}" name=""/>'
        '<wp:cNvGraphicFramePr/>'
        '<a:graphic>'
        '<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">'
        f'<wps:wsp>'
        f'<wps:cNvPr id="{sp_id}" name="Shape {sp_id}"/>'
        '<wps:cNvSpPr/>'
        '<wps:spPr bwMode="auto">'
        '<a:xfrm><a:off x="2023046" y="3779365"/><a:ext cx="6645909" cy="1270"/></a:xfrm>'
        '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/>'
        '<a:rect l="l" t="t" r="r" b="b"/>'
        '<a:pathLst>'
        '<a:path w="6645909" h="120000" fill="norm" stroke="1" extrusionOk="0">'
        '<a:moveTo><a:pt x="0" y="0"/></a:moveTo>'
        '<a:lnTo><a:pt x="6645605" y="0"/></a:lnTo>'
        '</a:path></a:pathLst></a:custGeom>'
        '<a:noFill/>'
        '<a:ln w="9525" cap="flat" cmpd="sng">'
        '<a:solidFill><a:srgbClr val="000000"/></a:solidFill>'
        '<a:prstDash val="solid"/><a:round/>'
        '<a:headEnd type="none" w="sm" len="sm"/>'
        '<a:tailEnd type="none" w="sm" len="sm"/>'
        '</a:ln>'
        '</wps:spPr>'
        '<wps:bodyPr rot="0">'
        '<a:prstTxWarp prst="textNoShape"><a:avLst/></a:prstTxWarp>'
        '<a:noAutofit/>'
        '</wps:bodyPr>'
        '</wps:wsp>'
        '</a:graphicData></a:graphic>'
        '</wp:anchor>'
        '</w:drawing>'
        '</mc:Choice>'
        '<mc:Fallback>'
        '<w:pict>'
        '<v:shape'
        ' style="position:absolute;z-index:0;o:allowoverlap:true;o:allowincell:true;'
        'mso-position-horizontal-relative:text;margin-left:0.60pt;'
        'mso-position-horizontal:absolute;mso-position-vertical-relative:text;'
        'margin-top:1.40pt;mso-position-vertical:absolute;'
        'width:561.60pt;height:0.80pt;"'
        ' path="m0,0l99995,0e" coordsize="100000,100000"'
        ' filled="f" strokecolor="#000000" strokeweight="0.75pt">'
        '<v:path textboxrect="0,0,100000,100000"/>'
        '<v:stroke dashstyle="solid"/>'
        '</v:shape>'
        '</w:pict>'
        '</mc:Fallback>'
        '</mc:AlternateContent>'
    )
    return etree.fromstring(xml.encode())
