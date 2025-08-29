from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# Analytics Schemas
class CampaignAnalytics(BaseModel):
    campaign_id: UUID
    campaign_name: str
    total_vendors: int
    emails_sent: int
    emails_delivered: int
    emails_opened: int
    emails_clicked: int
    whatsapp_sent: int
    whatsapp_delivered: int
    whatsapp_read: int
    responses_received: int
    response_rate: float
    completion_rate: float
    created_at: datetime


class VendorEngagement(BaseModel):
    vendor_id: UUID
    vendor_name: str
    company_name: str
    total_campaigns: int
    emails_received: int
    emails_opened: int
    whatsapp_received: int
    whatsapp_read: int
    responses_submitted: int
    engagement_score: float
    last_interaction: Optional[datetime]


class DashboardMetrics(BaseModel):
    total_campaigns: int
    active_campaigns: int
    total_vendors: int
    total_responses: int
    pending_responses: int
    completed_responses: int
    email_delivery_rate: float
    whatsapp_delivery_rate: float
    overall_response_rate: float
    recent_activity: List[Dict[str, Any]]


class TimeSeriesMetrics(BaseModel):
    date: str
    campaigns_created: int
    emails_sent: int
    whatsapp_sent: int
    responses_received: int
    new_vendors: int


class GeographicMetrics(BaseModel):
    state: str
    city: Optional[str]
    vendor_count: int
    response_rate: float
    avg_engagement_score: float


class PerformanceMetrics(BaseModel):
    timeframe: str  # 'daily', 'weekly', 'monthly'
    metrics: List[TimeSeriesMetrics]


class AnalyticsResponse(BaseModel):
    dashboard: DashboardMetrics
    campaign_analytics: List[CampaignAnalytics]
    vendor_engagement: List[VendorEngagement]
    geographic_data: List[GeographicMetrics]
    performance_trends: PerformanceMetrics


# Report Generation Schemas
class ReportRequest(BaseModel):
    report_type: str = Field(..., pattern=r'^(campaign|vendor|compliance|performance)$')
    campaign_ids: Optional[List[UUID]] = None
    vendor_ids: Optional[List[UUID]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    format: str = Field('pdf', pattern=r'^(pdf|excel|csv)$')
    include_charts: bool = True


class ReportResponse(BaseModel):
    report_id: UUID
    download_url: str
    expires_at: datetime
    file_size: int
    generated_at: datetime
