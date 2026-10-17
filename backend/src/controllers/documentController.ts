import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';
import { DocumentStatus } from '@prisma/client';

export const requestDocument = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { documentName, purpose } = req.body;
    if (!documentName || typeof documentName !== 'string' || !documentName.trim()) {
      return res.status(400).json({ success: false, message: 'documentName is required' });
    }

    // Resolve student record
    let studentId = req.body.studentId;
    const isStudent = authReq.user?.role === 'student' || authReq.user?.roles?.includes('student');

    if (isStudent || !studentId) {
      const studentProfile = await prisma.student.findUnique({
        where: { userId }
      });
      if (!studentProfile) {
        return res.status(404).json({ success: false, message: 'Student profile not found for user' });
      }
      studentId = studentProfile.id;
    }

    const doc = await prisma.documentRequest.create({
      data: {
        studentId,
        documentName: documentName.trim(),
        purpose: purpose ? String(purpose).trim() : null,
        status: DocumentStatus.pending
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true, code: true } }
          }
        }
      }
    });

    res.status(201).json({ success: true, document: doc });
  } catch (error) {
    console.error('[DocumentController] requestDocument error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyDocumentRequests = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const studentProfile = await prisma.student.findUnique({
      where: { userId }
    });
    if (!studentProfile) {
      return res.status(404).json({ success: false, message: 'Student profile not found for user' });
    }

    const documents = await prisma.documentRequest.findMany({
      where: { studentId: studentProfile.id },
      include: {
        reviewer: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });

    res.json({ success: true, documents });
  } catch (error) {
    console.error('[DocumentController] getMyDocumentRequests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDocumentQueue = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const callerRole = authReq.user?.role;
    const callerId = authReq.user?.id;
    const { status, departmentId } = req.query;

    const whereClause: any = {};
    if (status && Object.values(DocumentStatus).includes(status as DocumentStatus)) {
      whereClause.status = status as DocumentStatus;
    }

    // Department isolation for HOD
    if (callerRole === 'hod' && callerId) {
      // Find department where this user is HOD or faculty
      const hodDept = await prisma.department.findFirst({
        where: {
          OR: [
            { headOfDepartment: { userId: callerId } },
            { faculty: { some: { userId: callerId } } }
          ]
        }
      });
      if (hodDept) {
        whereClause.student = { departmentId: hodDept.id };
      }
    } else if (departmentId) {
      whereClause.student = { departmentId: String(departmentId) };
    }

    const documents = await prisma.documentRequest.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            department: { select: { id: true, name: true, code: true } }
          }
        },
        reviewer: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });

    res.json({ success: true, documents });
  } catch (error) {
    console.error('[DocumentController] getDocumentQueue error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const approveDocumentRequest = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const reviewerId = authReq.user?.id;
    const { id } = req.params;
    const { documentUrl } = req.body;

    const existing = await prisma.documentRequest.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Document request not found' });
    }

    const updated = await prisma.documentRequest.update({
      where: { id },
      data: {
        status: DocumentStatus.completed,
        reviewerId,
        reviewedAt: new Date(),
        rejectionReason: null,
        documentUrl: documentUrl ? String(documentUrl).trim() : null
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true, code: true } }
          }
        },
        reviewer: { select: { id: true, name: true, role: true } }
      }
    });

    res.json({
      success: true,
      message: 'Document request approved and marked completed',
      document: updated
    });
  } catch (error) {
    console.error('[DocumentController] approveDocumentRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const rejectDocumentRequest = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const reviewerId = authReq.user?.id;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
      return res.status(400).json({ success: false, message: 'rejectionReason is mandatory for rejection' });
    }

    const existing = await prisma.documentRequest.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Document request not found' });
    }

    const updated = await prisma.documentRequest.update({
      where: { id },
      data: {
        status: DocumentStatus.rejected,
        reviewerId,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason.trim()
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        reviewer: { select: { id: true, name: true, role: true } }
      }
    });

    res.json({
      success: true,
      message: 'Document request rejected',
      document: updated
    });
  } catch (error) {
    console.error('[DocumentController] rejectDocumentRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
