from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from io import BytesIO
from datetime import datetime

def generate_pdf_report(analysis_record, report_data) -> bytes:
    buffer = BytesIO()
    # 0.75 in margins = 54 points
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        rightMargin=54, 
        leftMargin=54,
        topMargin=54, 
        bottomMargin=54
    )
    story = []
    
    styles = getSampleStyleSheet()
    
    # Custom colors to match the design system
    primary_color = colors.HexColor('#23472b')       # Forest/Primary
    secondary_color = colors.HexColor('#745a39')     # Gold/Secondary
    outline_color = colors.HexColor('#c2c8bf')       # Border
    text_color = colors.HexColor('#191c1b')          # On-surface dark
    bg_low = colors.HexColor('#f2f4f2')              # Low background
    
    # Custom Paragraph Styles
    title_style = ParagraphStyle(
        name='DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=primary_color,
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        name='SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        name='DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_color,
        spaceAfter=6
    )

    mono_style = ParagraphStyle(
        name='DocMono',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#424941')
    )
    
    # Title
    story.append(Paragraph("PatentPilot AI — Patentability Report", title_style))
    story.append(Spacer(1, 10))
    
    # Meta Data Table
    rec_time = analysis_record.created_at.strftime("%Y-%m-%d %H:%M:%S") if analysis_record.created_at else datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    meta_data = [
        [Paragraph("<b>Analysis ID:</b>", body_style), Paragraph(str(analysis_record.id), body_style)],
        [Paragraph("<b>Generated At:</b>", body_style), Paragraph(rec_time, body_style)],
        [Paragraph("<b>Chemical Entity:</b>", body_style), Paragraph(getattr(analysis_record, "chemical_name", "Unidentified Compound") or "Unidentified Compound", body_style)],
        [Paragraph("<b>Molecular Formula:</b>", body_style), Paragraph(getattr(analysis_record, "formula", "N/A") or "N/A", body_style)],
        [Paragraph("<b>SMILES Notation:</b>", body_style), Paragraph(analysis_record.smiles_input or "N/A", mono_style)],
        [Paragraph("<b>Biological Target:</b>", body_style), Paragraph(analysis_record.target or "Not specified", body_style)],
        [Paragraph("<b>Therapeutic Indication:</b>", body_style), Paragraph(analysis_record.indication or "Not specified", body_style)],
    ]
    t = Table(meta_data, colWidths=[130, 370])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, outline_color),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    # Recommendation Banner
    rec_value = report_data.overall_recommendation
    rec_label = "Low Patent Risk"
    banner_color = colors.HexColor('#c3edc6') # Light green
    banner_text_color = colors.HexColor('#2a4e32')
    
    if rec_value == "requires_review":
        rec_label = "Requires Expert Review"
        banner_color = colors.HexColor('#fedab0') # Light orange
        banner_text_color = colors.HexColor('#795e3d')
    elif rec_value == "high_risk":
        rec_label = "High Patent Risk"
        banner_color = colors.HexColor('#ffdad6') # Light red
        banner_text_color = colors.HexColor('#93000a')
        
    banner_style = ParagraphStyle(
        name='BannerText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=banner_text_color,
        alignment=1 # Centered
    )
    
    banner_data = [[Paragraph(f"OVERALL RECOMMENDATION: {rec_label.upper()}", banner_style)]]
    banner_table = Table(banner_data, colWidths=[500])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), banner_color),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('BOX', (0,0), (-1,-1), 1, banner_text_color),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 15))
    
    # 1.0 Executive Summary
    story.append(Paragraph("1.0 Executive Summary", h1_style))
    story.append(Paragraph(report_data.executive_summary, body_style))
    story.append(Spacer(1, 10))
    
    # 2.0 Key Similar Patents
    story.append(Paragraph("2.0 Key Similar Patents", h1_style))
    if report_data.key_similar_patents:
        patents_headers = [
            Paragraph("<b>Patent Number</b>", body_style),
            Paragraph("<b>Title</b>", body_style),
            Paragraph("<b>Relevance Score</b>", body_style),
        ]
        patents_table_data = [patents_headers]
        for p in report_data.key_similar_patents:
            patents_table_data.append([
                Paragraph(p.get("patent_number", "N/A"), body_style),
                Paragraph(p.get("title", "N/A"), body_style),
                Paragraph(f"{p.get('composite_risk_score', 0):.1f}%", body_style),
            ])
        pt = Table(patents_table_data, colWidths=[110, 310, 80])
        pt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), bg_low),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 0.5, outline_color),
        ]))
        story.append(pt)
    else:
        story.append(Paragraph("No similar patents found.", body_style))
    story.append(Spacer(1, 10))
    
    # 3.0 Potential Novelty Concerns
    story.append(Paragraph("3.0 Potential Novelty Concerns", h1_style))
    story.append(Paragraph(report_data.novelty_concerns, body_style))
    story.append(Spacer(1, 10))
    
    # 4.0 Patents Requiring Manual Review
    story.append(Paragraph("4.0 Patents Requiring Manual Review", h1_style))
    if report_data.manual_review_patents:
        review_headers = [
            Paragraph("<b>Patent Number / ID</b>", body_style),
            Paragraph("<b>Flag Reason</b>", body_style),
        ]
        review_table_data = [review_headers]
        for p in report_data.manual_review_patents:
            p_label = p.get("patent_number") or p.get("patent_id")
            review_table_data.append([
                Paragraph(p_label, body_style),
                Paragraph(p.get("reason", "Algorithmic review flag"), body_style),
            ])
        rt = Table(review_table_data, colWidths=[150, 350])
        rt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), bg_low),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 0.5, outline_color),
        ]))
        story.append(rt)
    else:
        story.append(Paragraph("No patents require manual review.", body_style))
    story.append(Spacer(1, 10))
    
    # 5.0 Methodology Notes
    story.append(Paragraph("5.0 Methodology Notes & Risk Rationale", h1_style))
    story.append(Paragraph(report_data.methodology_notes, body_style))
    story.append(Paragraph(f"<b>Confidence Assessment:</b> {int(report_data.confidence_level * 100)}% system certainty.", body_style))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
