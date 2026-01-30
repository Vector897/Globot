import * as React from 'react';
import { cn } from '../ui/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import type { DocumentSummary, MissingDocument, Recommendation } from '../../services/documentApi';

interface GapAnalysisReportProps {
  overallStatus: string;
  complianceScore: number;
  validDocuments: DocumentSummary[];
  expiringDocuments: DocumentSummary[];
  expiredDocuments: DocumentSummary[];
  missingDocuments: MissingDocument[];
  // Categorized documents (optional for backwards compatibility)
  vesselMissingDocuments?: MissingDocument[];
  cargoMissingDocuments?: MissingDocument[];
  vesselValidDocuments?: DocumentSummary[];
  cargoValidDocuments?: DocumentSummary[];
  recommendations: Recommendation[];
  className?: string;
}

const STATUS_CONFIG = {
  COMPLIANT: {
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    label: 'Compliant'
  },
  PARTIAL: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    label: 'Partially Compliant'
  },
  NON_COMPLIANT: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    label: 'Non-Compliant'
  },
  ERROR: {
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    label: 'Error'
  },
  PENDING_REVIEW: {
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    label: 'Pending Review'
  }
};

const PRIORITY_BADGE_COLORS = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200'
};


function DocumentList({
  title,
  documents,
  type
}: {
  title: string;
  documents: DocumentSummary[];
  type: 'valid' | 'expiring' | 'expired';
}) {
  if (documents.length === 0) return null;

  const icons = {
    valid: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    expiring: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    expired: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    )
  };

  const colors = {
    valid: 'border-green-200 bg-green-50',
    expiring: 'border-yellow-200 bg-yellow-50',
    expired: 'border-red-200 bg-red-50'
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        {icons[type]}
        {title} ({documents.length})
      </h4>
      <div className="space-y-2">
        {documents.map((doc, index) => (
          <div
            key={index}
            className={cn('p-2 rounded-lg border text-sm', colors[type])}
          >
            <div className="flex justify-between items-start">
              <span className="font-medium">
                {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              {doc.days_until_expiry !== null && doc.days_until_expiry !== undefined && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded',
                  doc.days_until_expiry < 0 ? 'bg-red-200 text-red-800' :
                  doc.days_until_expiry <= 30 ? 'bg-yellow-200 text-yellow-800' :
                  'bg-green-200 text-green-800'
                )}>
                  {doc.days_until_expiry < 0
                    ? `Expired ${Math.abs(doc.days_until_expiry)} days ago`
                    : `${doc.days_until_expiry} days`}
                </span>
              )}
            </div>
            {doc.title && (
              <p className="text-xs text-gray-500 mt-1">
                File: {doc.title}
              </p>
            )}
            {doc.expiry_date && (
              <p className="text-xs text-gray-500 mt-1">
                Expires: {doc.expiry_date}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MissingDocumentsList({ 
  documents, 
  title = "Missing Documents",
  icon 
}: { 
  documents: MissingDocument[]; 
  title?: string;
  icon?: React.ReactNode;
}) {
  if (documents.length === 0) return null;

  const defaultIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        {icon || defaultIcon}
        {title} ({documents.length})
      </h4>
      <div className="space-y-2">
        {documents.map((doc, index) => (
          <div
            key={index}
            className="p-2 rounded-lg border border-orange-200 bg-orange-50 text-sm"
          >
            <div className="flex justify-between items-start">
              <span className="font-medium">
                {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <Badge className={cn('text-xs', PRIORITY_BADGE_COLORS[doc.priority])}>
                {doc.priority}
              </Badge>
            </div>
            {doc.required_by.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Required by: {doc.required_by.join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


export function GapAnalysisReport({
  overallStatus,
  complianceScore,
  validDocuments,
  expiringDocuments,
  expiredDocuments,
  missingDocuments,
  vesselMissingDocuments,
  cargoMissingDocuments,
  vesselValidDocuments,
  cargoValidDocuments,
  recommendations,
  className
}: GapAnalysisReportProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  // Combine all "on file" documents (valid + expiring + expired)
  const onFileDocuments = [...validDocuments, ...expiringDocuments, ...expiredDocuments];

  const config = STATUS_CONFIG[overallStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING_REVIEW;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Compact Summary Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold">{complianceScore}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Score</span>
              </div>
              <Badge className={cn('text-sm px-3 py-1', config.bgColor, config.textColor, 'border')}>
                {config.label}
              </Badge>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-xl font-bold text-orange-600">{missingDocuments.length}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Missing</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">{onFileDocuments.length}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">On File</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Two-Panel Overview — Missing vs On File */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Panel: Missing Documents */}
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Missing Documents
            </CardTitle>
            <CardDescription>
              {missingDocuments.length === 0
                ? 'No missing documents detected'
                : `${missingDocuments.length} document${missingDocuments.length !== 1 ? 's' : ''} required`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {missingDocuments.length === 0 ? (
              <p className="text-sm text-green-600 py-2">All required documents are on file.</p>
            ) : (
              <div className="space-y-2">
                {missingDocuments.map((doc, index) => (
                  <div
                    key={index}
                    className="p-2 rounded-lg border border-orange-200 bg-orange-50 text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">
                        {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <Badge className={cn('text-xs', PRIORITY_BADGE_COLORS[doc.priority])}>
                        {doc.priority}
                      </Badge>
                    </div>
                    {doc.required_by.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Required by: {doc.required_by.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Documents On File */}
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Documents On File
            </CardTitle>
            <CardDescription>
              {onFileDocuments.length === 0
                ? 'No documents on file'
                : `${onFileDocuments.length} document${onFileDocuments.length !== 1 ? 's' : ''} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {onFileDocuments.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {onFileDocuments.map((doc, index) => {
                  const statusColor =
                    doc.status === 'valid' ? 'border-green-200 bg-green-50' :
                    doc.status === 'expiring_soon' ? 'border-yellow-200 bg-yellow-50' :
                    'border-red-200 bg-red-50';
                  const statusBadge =
                    doc.status === 'valid' ? 'bg-green-200 text-green-800' :
                    doc.status === 'expiring_soon' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-red-200 text-red-800';
                  const statusLabel =
                    doc.status === 'valid' ? 'Valid' :
                    doc.status === 'expiring_soon' ? 'Expiring' :
                    'Expired';

                  return (
                    <div
                      key={index}
                      className={cn('p-2 rounded-lg border text-sm', statusColor)}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium">
                          {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded', statusBadge)}>
                          {statusLabel}
                        </span>
                      </div>
                      {doc.title && (
                        <p className="text-xs text-gray-500 mt-1">File: {doc.title}</p>
                      )}
                      {doc.expiry_date && (
                        <p className="text-xs text-gray-500 mt-0.5">Expires: {doc.expiry_date}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Detailed Breakdown (collapsible) */}
      <Card>
        <CardHeader
          className="pb-2 cursor-pointer select-none"
          onClick={() => setShowDetails(!showDetails)}
        >
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Detailed Breakdown
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn('transition-transform', showDetails ? 'rotate-180' : '')}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </CardTitle>
          <CardDescription>
            Expiring, expired, and category breakdowns
          </CardDescription>
        </CardHeader>

        {showDetails && (
          <CardContent className="space-y-6">
            {/* Document Status Lists */}
            <div className="space-y-4">
              <DocumentList title="Valid Documents" documents={validDocuments} type="valid" />
              <DocumentList title="Expiring Soon" documents={expiringDocuments} type="expiring" />
              <DocumentList title="Expired Documents" documents={expiredDocuments} type="expired" />
            </div>

            {/* Category Split: Vessel vs Cargo Missing */}
            {(vesselMissingDocuments?.length || cargoMissingDocuments?.length ||
              vesselValidDocuments?.length || cargoValidDocuments?.length) ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">By Category</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vessel */}
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <h5 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                        <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                        <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
                        <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
                        <path d="M12 10v4" />
                        <path d="M12 2v3" />
                      </svg>
                      Ship Owner/Operator
                    </h5>
                    {vesselMissingDocuments && vesselMissingDocuments.length > 0 && (
                      <MissingDocumentsList documents={vesselMissingDocuments} title="Missing" />
                    )}
                    {vesselValidDocuments && vesselValidDocuments.length > 0 && (
                      <div className="mt-2">
                        <DocumentList title="On File" documents={vesselValidDocuments} type="valid" />
                      </div>
                    )}
                    {(!vesselMissingDocuments?.length && !vesselValidDocuments?.length) && (
                      <p className="text-xs text-gray-400">No vessel documents</p>
                    )}
                  </div>

                  {/* Cargo */}
                  <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                    <h5 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                        <path d="m3.3 7 8.7 5 8.7-5" />
                        <path d="M12 22V12" />
                      </svg>
                      Cargo Documents
                    </h5>
                    {cargoMissingDocuments && cargoMissingDocuments.length > 0 && (
                      <MissingDocumentsList documents={cargoMissingDocuments} title="Missing" />
                    )}
                    {cargoValidDocuments && cargoValidDocuments.length > 0 && (
                      <div className="mt-2">
                        <DocumentList title="On File" documents={cargoValidDocuments} type="valid" />
                      </div>
                    )}
                    {(!cargoMissingDocuments?.length && !cargoValidDocuments?.length) && (
                      <p className="text-xs text-gray-400">No cargo documents</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={cn(
                        'p-3 rounded-lg border',
                        rec.priority === 'CRITICAL' ? 'border-red-200 bg-red-50' :
                        rec.priority === 'HIGH' ? 'border-orange-200 bg-orange-50' :
                        'border-yellow-200 bg-yellow-50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Badge className={cn('text-xs flex-shrink-0', PRIORITY_BADGE_COLORS[rec.priority])}>
                          {rec.priority}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{rec.action}</p>
                          {rec.documents.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Documents: {rec.documents.join(', ')}
                            </p>
                          )}
                          {rec.deadline && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Deadline: {rec.deadline}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default GapAnalysisReport;
