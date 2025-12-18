---
title: "Building a Pathology Lab Management System: Complete Technical Guide"
description: "Learn how to design and build a modern pathology laboratory management system. Covers sample tracking, test workflows, report generation, billing integration, and compliance requirements for diagnostic labs."
date: "2024-12-16"
author: "Tushar Agrawal"
tags: ["Pathology", "Lab Management", "Healthcare", "LIMS", "Backend", "Python"]
image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Pathology laboratories are the backbone of modern healthcare diagnostics. Having built lab management systems at Dr. Dangs Lab, I understand the unique challenges these facilities face. This guide covers how to build a comprehensive pathology lab management system from the ground up.

## Understanding Pathology Lab Workflows

### The Sample Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PATHOLOGY LAB WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Patient         Collection        Transport        Lab            Reporting
  Registration    Center            & Logistics      Processing     & Delivery
      │               │                  │               │               │
      ▼               ▼                  ▼               ▼               ▼
  ┌───────┐      ┌─────────┐       ┌─────────┐     ┌─────────┐     ┌─────────┐
  │Register│────►│ Collect │──────►│Transport│────►│ Process │────►│ Report  │
  │Patient │     │ Sample  │       │ to Lab  │     │ & Test  │     │ Results │
  └───────┘      └─────────┘       └─────────┘     └─────────┘     └─────────┘
      │               │                  │               │               │
      ▼               ▼                  ▼               ▼               ▼
  - Demographics  - Barcode         - Chain of      - Queue        - PDF Gen
  - History       - Labeling          custody       - Analyzers    - Delivery
  - Test orders   - Requirements    - Temperature   - QC checks    - Archive
                  - Time stamp        tracking      - Validation
```

## Core Modules

### 1. Patient Registration Module

```python
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
import uuid

class Address(BaseModel):
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str

class Patient(BaseModel):
    id: str = Field(default_factory=lambda: f"PT{uuid.uuid4().hex[:8].upper()}")
    name: str
    phone: str
    email: Optional[str] = None
    date_of_birth: datetime
    gender: str
    blood_group: Optional[str] = None
    address: Address
    emergency_contact: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PatientService:
    def __init__(self, db):
        self.db = db

    async def register(self, patient_data: dict) -> Patient:
        # Check for existing patient
        existing = await self.db.patients.find_one({
            "$or": [
                {"phone": patient_data["phone"]},
                {"email": patient_data.get("email")}
            ]
        })

        if existing:
            return Patient(**existing)

        patient = Patient(**patient_data)
        await self.db.patients.insert_one(patient.dict())
        return patient

    async def search(self, query: str) -> list[Patient]:
        """Search patients by name, phone, or ID"""
        results = await self.db.patients.find({
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"phone": {"$regex": query}},
                {"id": query.upper()}
            ]
        }).to_list(50)
        return [Patient(**p) for p in results]

    async def get_history(self, patient_id: str) -> dict:
        """Get patient's complete test history"""
        samples = await self.db.samples.find({
            "patient_id": patient_id
        }).sort("collected_at", -1).to_list(100)

        return {
            "patient_id": patient_id,
            "total_visits": len(samples),
            "tests": [
                {
                    "sample_id": s["id"],
                    "tests": s["tests"],
                    "date": s["collected_at"],
                    "status": s["status"]
                }
                for s in samples
            ]
        }
```

### 2. Test Catalog Management

```python
from enum import Enum
from decimal import Decimal

class SampleType(Enum):
    BLOOD = "blood"
    SERUM = "serum"
    PLASMA = "plasma"
    URINE = "urine"
    STOOL = "stool"
    SWAB = "swab"
    TISSUE = "tissue"
    CSF = "csf"

class TestCategory(Enum):
    HEMATOLOGY = "hematology"
    BIOCHEMISTRY = "biochemistry"
    MICROBIOLOGY = "microbiology"
    IMMUNOLOGY = "immunology"
    HISTOPATHOLOGY = "histopathology"
    MOLECULAR = "molecular"

class Test(BaseModel):
    code: str  # e.g., "CBC", "LFT", "KFT"
    name: str
    category: TestCategory
    sample_type: SampleType
    sample_volume: float  # in mL
    container_type: str  # e.g., "EDTA", "Plain", "Fluoride"
    fasting_required: bool = False
    turnaround_time: int  # in hours
    price: Decimal
    parameters: list[str]  # Individual test parameters
    reference_ranges: dict  # Age/gender specific ranges
    method: str  # Testing methodology
    department: str
    is_active: bool = True

# Example test definition
cbc_test = Test(
    code="CBC",
    name="Complete Blood Count",
    category=TestCategory.HEMATOLOGY,
    sample_type=SampleType.BLOOD,
    sample_volume=3.0,
    container_type="EDTA (Purple Top)",
    fasting_required=False,
    turnaround_time=4,
    price=Decimal("450.00"),
    parameters=[
        "Hemoglobin", "RBC Count", "WBC Count", "Platelet Count",
        "PCV/Hematocrit", "MCV", "MCH", "MCHC", "RDW",
        "Differential Count (Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils)"
    ],
    reference_ranges={
        "Hemoglobin": {
            "male_adult": {"min": 13.5, "max": 17.5, "unit": "g/dL"},
            "female_adult": {"min": 12.0, "max": 16.0, "unit": "g/dL"},
            "child": {"min": 11.0, "max": 14.0, "unit": "g/dL"}
        },
        "WBC Count": {
            "adult": {"min": 4000, "max": 11000, "unit": "/cumm"}
        }
    },
    method="Automated Cell Counter",
    department="Hematology"
)
```

### 3. Sample Collection and Tracking

```python
from datetime import datetime
from typing import Optional
import qrcode
import io
import base64

class SampleStatus(Enum):
    REGISTERED = "registered"
    COLLECTED = "collected"
    IN_TRANSIT = "in_transit"
    RECEIVED = "received"
    PROCESSING = "processing"
    PENDING_VALIDATION = "pending_validation"
    VALIDATED = "validated"
    REPORTED = "reported"
    DISPATCHED = "dispatched"

class Sample(BaseModel):
    id: str  # Unique barcode/accession number
    patient_id: str
    tests: list[str]  # Test codes
    collection_center: str
    collected_by: str
    collected_at: datetime
    sample_type: SampleType
    container_type: str
    fasting_status: bool
    status: SampleStatus = SampleStatus.REGISTERED
    priority: str = "routine"  # routine, urgent, stat
    special_instructions: Optional[str] = None
    rejection_reason: Optional[str] = None

class SampleService:
    def __init__(self, db, barcode_service):
        self.db = db
        self.barcode = barcode_service

    async def create_sample(self, data: dict) -> Sample:
        # Generate unique accession number
        accession = await self._generate_accession_number()

        sample = Sample(
            id=accession,
            **data,
            status=SampleStatus.REGISTERED,
            collected_at=datetime.utcnow()
        )

        # Validate sample requirements
        await self._validate_sample_requirements(sample)

        # Store sample
        await self.db.samples.insert_one(sample.dict())

        # Generate barcode label
        barcode_label = self.barcode.generate(sample)

        return sample, barcode_label

    async def _generate_accession_number(self) -> str:
        """Generate unique accession number: YYMMDD-XXXXX"""
        today = datetime.now().strftime("%y%m%d")
        count = await self.db.samples.count_documents({
            "id": {"$regex": f"^{today}-"}
        })
        return f"{today}-{count + 1:05d}"

    async def _validate_sample_requirements(self, sample: Sample):
        """Validate sample meets test requirements"""
        for test_code in sample.tests:
            test = await self.db.tests.find_one({"code": test_code})
            if not test:
                raise ValueError(f"Unknown test: {test_code}")

            # Check sample type compatibility
            if test["sample_type"] != sample.sample_type.value:
                raise ValueError(
                    f"Test {test_code} requires {test['sample_type']}, "
                    f"got {sample.sample_type.value}"
                )

            # Check fasting requirement
            if test["fasting_required"] and not sample.fasting_status:
                raise ValueError(f"Test {test_code} requires fasting")

    async def update_status(
        self,
        sample_id: str,
        new_status: SampleStatus,
        user_id: str,
        notes: Optional[str] = None
    ):
        """Update sample status with audit trail"""
        sample = await self.db.samples.find_one({"id": sample_id})
        if not sample:
            raise ValueError("Sample not found")

        # Create status log entry
        status_log = {
            "sample_id": sample_id,
            "from_status": sample["status"],
            "to_status": new_status.value,
            "changed_by": user_id,
            "changed_at": datetime.utcnow(),
            "notes": notes
        }
        await self.db.status_logs.insert_one(status_log)

        # Update sample
        await self.db.samples.update_one(
            {"id": sample_id},
            {"$set": {"status": new_status.value, "updated_at": datetime.utcnow()}}
        )

    async def reject_sample(
        self,
        sample_id: str,
        reason: str,
        user_id: str
    ):
        """Reject sample with documented reason"""
        rejection_reasons = [
            "Hemolyzed sample",
            "Lipemic sample",
            "Insufficient quantity",
            "Wrong container",
            "Clotted sample",
            "Sample leaked",
            "Patient ID mismatch",
            "Sample too old"
        ]

        if reason not in rejection_reasons:
            raise ValueError(f"Invalid rejection reason: {reason}")

        await self.db.samples.update_one(
            {"id": sample_id},
            {
                "$set": {
                    "status": "rejected",
                    "rejection_reason": reason,
                    "rejected_by": user_id,
                    "rejected_at": datetime.utcnow()
                }
            }
        )

        # Notify collection center for re-collection
        await self._notify_recollection(sample_id, reason)
```

### 4. Test Processing and Results Entry

```python
class TestResult(BaseModel):
    sample_id: str
    test_code: str
    parameter: str
    value: float | str
    unit: str
    reference_range: dict
    flag: Optional[str] = None  # H, L, C (Critical)
    method: str
    analyzer: Optional[str] = None
    performed_by: str
    performed_at: datetime
    validated_by: Optional[str] = None
    validated_at: Optional[datetime] = None

class ResultService:
    def __init__(self, db, notification_service):
        self.db = db
        self.notifications = notification_service

    async def enter_result(self, result_data: dict) -> TestResult:
        """Enter test result with automatic flagging"""
        result = TestResult(**result_data)

        # Auto-calculate flag based on reference range
        result.flag = self._calculate_flag(
            result.value,
            result.reference_range
        )

        # Check for critical values
        if self._is_critical(result):
            await self._handle_critical_value(result)

        await self.db.results.insert_one(result.dict())
        return result

    def _calculate_flag(self, value: float, reference: dict) -> Optional[str]:
        """Calculate result flag based on reference range"""
        if isinstance(value, str):
            return None

        min_val = reference.get("min")
        max_val = reference.get("max")
        critical_low = reference.get("critical_low")
        critical_high = reference.get("critical_high")

        if critical_low and value < critical_low:
            return "C"  # Critical Low
        if critical_high and value > critical_high:
            return "C"  # Critical High
        if min_val and value < min_val:
            return "L"  # Low
        if max_val and value > max_val:
            return "H"  # High
        return None  # Normal

    def _is_critical(self, result: TestResult) -> bool:
        """Check if result is critical and needs immediate attention"""
        return result.flag == "C"

    async def _handle_critical_value(self, result: TestResult):
        """Handle critical values - immediate notification"""
        sample = await self.db.samples.find_one({"id": result.sample_id})
        patient = await self.db.patients.find_one({"id": sample["patient_id"]})

        # Log critical value
        await self.db.critical_logs.insert_one({
            "sample_id": result.sample_id,
            "patient_id": patient["id"],
            "test": result.test_code,
            "parameter": result.parameter,
            "value": result.value,
            "timestamp": datetime.utcnow(),
            "notified": False
        })

        # Notify duty doctor
        await self.notifications.send_critical_alert(
            patient=patient,
            result=result
        )

    async def validate_results(
        self,
        sample_id: str,
        validator_id: str
    ):
        """Validate all results for a sample"""
        # Check all results entered
        results = await self.db.results.find({
            "sample_id": sample_id,
            "validated_at": None
        }).to_list(100)

        if not results:
            raise ValueError("No pending results to validate")

        # Mark as validated
        await self.db.results.update_many(
            {"sample_id": sample_id},
            {
                "$set": {
                    "validated_by": validator_id,
                    "validated_at": datetime.utcnow()
                }
            }
        )

        # Update sample status
        await self.db.samples.update_one(
            {"id": sample_id},
            {"$set": {"status": "validated"}}
        )
```

### 5. Report Generation

```python
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
import boto3

class ReportGenerator:
    def __init__(self, db, s3_client):
        self.db = db
        self.s3 = s3_client
        self.styles = getSampleStyleSheet()

    async def generate_report(self, sample_id: str) -> str:
        """Generate PDF report for a sample"""
        # Fetch all required data
        sample = await self.db.samples.find_one({"id": sample_id})
        patient = await self.db.patients.find_one({"id": sample["patient_id"]})
        results = await self.db.results.find({"sample_id": sample_id}).to_list(100)

        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []

        # Add header with lab info
        elements.append(self._create_header())

        # Add patient info
        elements.append(self._create_patient_section(patient))

        # Add sample info
        elements.append(self._create_sample_section(sample))

        # Add results table
        elements.append(self._create_results_table(results))

        # Add footer with signatures
        elements.append(self._create_footer(sample))

        doc.build(elements)

        # Upload to S3
        buffer.seek(0)
        s3_key = f"reports/{patient['id']}/{sample_id}.pdf"
        self.s3.upload_fileobj(buffer, 'lab-reports', s3_key)

        # Generate signed URL
        url = self.s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': 'lab-reports', 'Key': s3_key},
            ExpiresIn=604800  # 7 days
        )

        return url

    def _create_results_table(self, results: list) -> Table:
        """Create formatted results table"""
        data = [['Test', 'Result', 'Unit', 'Reference Range', 'Flag']]

        for result in results:
            flag_display = {
                'H': '↑ High',
                'L': '↓ Low',
                'C': '⚠️ Critical',
                None: ''
            }.get(result['flag'], '')

            ref_range = f"{result['reference_range'].get('min', '')} - {result['reference_range'].get('max', '')}"

            data.append([
                result['parameter'],
                str(result['value']),
                result['unit'],
                ref_range,
                flag_display
            ])

        table = Table(data, colWidths=[150, 80, 60, 100, 80])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))

        return table
```

## Quality Control

```python
class QualityControl:
    """Quality control for lab operations"""

    async def daily_qc_check(self, analyzer_id: str, qc_results: dict):
        """Record daily QC results for analyzer"""
        qc_record = {
            "analyzer_id": analyzer_id,
            "date": datetime.utcnow().date().isoformat(),
            "results": qc_results,
            "status": self._evaluate_qc(qc_results),
            "recorded_at": datetime.utcnow()
        }

        await self.db.qc_records.insert_one(qc_record)

        if qc_record["status"] != "pass":
            await self._notify_qc_failure(analyzer_id, qc_results)

    def _evaluate_qc(self, results: dict) -> str:
        """Evaluate QC results using Westgard rules"""
        # Implement Westgard rules
        # 1:2s, 1:3s, 2:2s, R:4s, 4:1s, 10x
        pass
```

## Key Takeaways

1. **Workflow First**: Understand lab workflows before coding
2. **Traceability**: Every sample needs complete audit trail
3. **Quality Control**: QC is not optional in pathology
4. **Integration**: Labs use many analyzers needing integration
5. **Compliance**: Healthcare regulations are strict
6. **Speed Matters**: Turnaround time is critical for patient care

## Conclusion

Building a pathology lab management system requires deep understanding of laboratory operations, healthcare compliance, and technical excellence. The system must be reliable, traceable, and efficient to support the critical work of diagnostic laboratories.

---

*Building laboratory systems? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss pathology technology.*
