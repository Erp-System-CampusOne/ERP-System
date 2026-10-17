import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FileText, Download, Clock, CheckCircle, AlertCircle, Printer, FileCheck, GraduationCap, Award, FileSignature } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStudentDocuments, useRequestDocument } from '@/features/student/hooks';
import { cn } from '@/lib/utils';
import type { DocumentRequestResponse } from '@/api/apiInterface';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface DocumentRequest {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  processingTime: string;
  required: boolean;
  price?: string;
  available: boolean;
}

const DOCUMENTS: DocumentRequest[] = [
  {
    id: 'bonafide',
    name: 'Bonafide Certificate',
    description: 'Official certificate confirming student enrollment and good standing',
    icon: FileCheck,
    color: 'bg-blue-500',
    processingTime: '2-3 working days',
    required: true,
    price: '₹50',
    available: true,
  },
  {
    id: 'id-card',
    name: 'ID Card Re-issue',
    description: 'Replacement for lost or damaged student ID card',
    icon: FileSignature,
    color: 'bg-violet-500',
    processingTime: '5-7 working days',
    required: false,
    price: '₹100',
    available: true,
  },
  {
    id: 'transcript',
    name: 'Official Transcript',
    description: 'Complete academic record with grades and credits',
    icon: FileText,
    color: 'bg-amber-500',
    processingTime: '7-10 working days',
    required: false,
    price: '₹200 per copy',
    available: true,
  },
  {
    id: 'degree',
    name: 'Degree Certificate',
    description: 'Degree completion certificate for graduation',
    icon: GraduationCap,
    color: 'bg-emerald-500',
    processingTime: '15-20 working days',
    required: false,
    price: '₹500',
    available: true,
  },
  {
    id: 'character',
    name: 'Character Certificate',
    description: 'Certificate verifying conduct and behavior during tenure',
    icon: Award,
    color: 'bg-cyan-500',
    processingTime: '3-5 working days',
    required: false,
    price: '₹50',
    available: true,
  },
  {
    id: 'course-completion',
    name: 'Course Completion Certificate',
    description: 'Certificate for completed courses with grades',
    icon: FileCheck,
    color: 'bg-orange-500',
    processingTime: '5-7 working days',
    required: false,
    price: '₹100',
    available: true,
  },
];

function DocumentCard({ doc, onRequest, isPending }: { doc: DocumentRequest; onRequest: () => void; isPending: boolean }) {
  const Icon = doc.icon;

  return (
    <motion.div variants={item} className="p-5 rounded-xl border-2 border-border/60 bg-card hover:border-primary/30 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl", doc.color)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{doc.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {doc.processingTime}
              </span>
              {doc.price && (
                <span className="text-xs font-medium text-primary">{doc.price}</span>
              )}
              {doc.required && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                  Required
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {doc.available ? (
            <>
              <Button size="sm" onClick={onRequest} disabled={isPending}>
                <Printer className="w-4 h-4 mr-2" />
                {isPending ? 'Requesting...' : 'Request'}
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Sample
              </Button>
            </>
          ) : (
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RequestHistoryItem({ request }: { request: { id: string; documentName: string; status: 'completed' | 'pending' | 'processing'; requestedDate: string; documentUrl?: string; reviewerName?: string } }) {
  const isCompleted = request.status === 'completed';
  const isProcessing = request.status === 'processing';

  const handleDownload = () => {
    if (request.documentUrl) {
      window.open(request.documentUrl, '_blank');
    } else {
      // Fallback: download a placeholder certificate text file
      const blob = new Blob([
        `OFFICIAL CERTIFICATE: ${request.documentName}\nStatus: Completed\nApproved by: ${request.reviewerName || 'Head of Department'}\nIssue Date: ${request.requestedDate}`
      ], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${request.documentName.toLowerCase().replace(/\s+/g, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <motion.div variants={item} className="flex items-center justify-between p-4 rounded-xl border-2 border-border/60 bg-card">
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-2.5 rounded-xl",
          isCompleted ? 'bg-success/10' : isProcessing ? 'bg-warning/10' : 'bg-muted'
        )}>
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-success" />
          ) : isProcessing ? (
            <Clock className="w-5 h-5 text-warning" />
          ) : (
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground">{request.documentName}</p>
          <p className="text-sm text-muted-foreground">
            Requested on {request.requestedDate}
            {request.reviewerName && ` • Approved by ${request.reviewerName}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn(
          "px-3 py-1.5 rounded-full text-xs font-semibold",
          isCompleted ? 'bg-success/10 text-success' :
          isProcessing ? 'bg-warning/10 text-warning' :
          'bg-muted text-muted-foreground'
        )}>
          {isCompleted ? 'Completed' : isProcessing ? 'Processing' : 'Pending'}
        </span>
        {isCompleted && (
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        )}
      </div>
    </motion.div>
  );
}


export default function StudentDocuments() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  
  const { data: documents = [] } = useStudentDocuments();
  const requestMutation = useRequestDocument();
  
  const requestsList = (documents as DocumentRequestResponse[]).map((doc) => ({
    id: doc.id,
    documentName: doc.documentName,
    status: doc.status as 'completed' | 'pending' | 'processing',
    requestedDate: new Date(doc.requestedAt).toLocaleDateString(),
    documentUrl: doc.documentUrl,
    reviewerName: doc.reviewer?.name,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight">Documents</h1>
                  <p className="mt-1 text-muted-foreground">
                    Request and download official documents
                  </p>
                </div>
              </div>
            </Wrapper>

            <Wrapper variants={item}>
              <div className="grid gap-4 md:grid-cols-3 mt-6">
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Available</span>
                      <div className="font-display text-2xl font-bold tracking-tight tabular-nums">
                        {DOCUMENTS.filter(d => d.available).length}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-warning/10">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Processing</p>
                      <p className="font-display text-2xl font-bold tabular-nums text-warning">
                        {requestsList.filter(r => r.status === 'processing').length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-success/10">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                      <p className="font-display text-2xl font-bold tabular-nums">{requestsList.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 space-y-8">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Request Documents</h2>
          <div className="space-y-3">
            {DOCUMENTS.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onRequest={() => requestMutation.mutate({ documentName: doc.name, purpose: doc.description })}
                isPending={requestMutation.isPending}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight mb-4">Request History</h2>
          <div className="space-y-3">
            {requestsList.map((request) => (
              <RequestHistoryItem key={request.id} request={request} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
