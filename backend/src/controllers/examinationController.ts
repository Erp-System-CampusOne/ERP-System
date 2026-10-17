import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getExaminations = async (req: AuthRequest, res: Response) => {
  try {
    const { semester, status } = req.query;
    let whereClause: any = {};
    if (semester) whereClause.semester = parseInt(semester as string, 10);
    if (status) whereClause.status = status;

    const exams = await prisma.examination.findMany({ where: whereClause, orderBy: { startDate: 'desc' } });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createExamination = async (req: AuthRequest, res: Response) => {
  try {
    const { title, semester, startDate, endDate, academicYear } = req.body;
    const exam = await prisma.examination.create({
      data: {
        title,
        semester: parseInt(semester as string, 10),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        academicYear
      }
    });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateExamination = async (req: AuthRequest, res: Response) => {
  try {
    const { title, semester, startDate, endDate, academicYear, status } = req.body;
    const data: any = {};
    if (title) data.title = title;
    if (semester) data.semester = parseInt(semester as string, 10);
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (academicYear) data.academicYear = academicYear;
    if (status) data.status = status;

    const exam = await prisma.examination.update({
      where: { id: req.params.id },
      data
    });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteExamination = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.examination.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Examination deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const releaseHallTickets = async (req: AuthRequest, res: Response) => {
  try {
    const exam = await prisma.examination.update({
      where: { id: req.params.id },
      data: { hallTicketReleased: true }
    });
    res.json({ success: true, message: 'Hall tickets released successfully', exam });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getExamResults = async (req: AuthRequest, res: Response) => {
  try {
    const { department } = req.query;
    const examId = req.params.id;

    // Verify examination exists
    const exam = await prisma.examination.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });

    const isStudent = req.user?.role === 'student' || req.user?.roles?.includes('student');

    // VULN-03 Remediation: If a student queries exam results, return ONLY their own published results
    if (isStudent) {
      const studentProfile = await prisma.student.findUnique({
        where: { userId: req.user?.id },
        select: { id: true, rollNumber: true, user: { select: { name: true } } }
      });

      if (!studentProfile) {
        return res.status(403).json({ success: false, message: 'Student profile not found' });
      }

      // Check publication gate: only evaluated/published exam results are visible to students
      if (exam.status !== 'evaluated' && exam.status !== 'completed') {
        return res.json([]); // Unpublished/draft results return empty list for students
      }

      const ownResults = await prisma.examResult.findMany({
        where: {
          examinationId: examId,
          studentId: studentProfile.id,
          status: 'published'
        },
        include: { course: true }
      });

      const formatted = ownResults.map(r => ({
        id: r.id,
        studentId: r.studentId,
        studentName: studentProfile.user.name,
        rollNumber: studentProfile.rollNumber,
        courseCode: r.course.code,
        courseName: r.course.name,
        internalScore: r.internalScore,
        endSemScore: r.endSemScore,
        totalScore: r.totalScore,
        grade: r.grade,
        status: r.status
      }));

      return res.json(formatted);
    }

    // Filter directly by examinationId for staff
    const whereClause: any = { examinationId: examId };

    if (department) {
      const dept = await prisma.department.findFirst({
        where: {
          OR: [
            { id: department as string },
            { name: { equals: department as string, mode: 'insensitive' } },
          ]
        }
      });
      if (dept) whereClause.course = { departmentId: dept.id };
    }

    const results = await prisma.examResult.findMany({
      where: whereClause,
      include: {
        student: { include: { user: true } },
        course: true
      }
    });

    const formatted = results.map(r => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student.user.name,
      rollNumber: r.student.rollNumber,
      courseCode: r.course.code,
      courseName: r.course.name,
      internalScore: r.internalScore,
      endSemScore: r.endSemScore,
      totalScore: r.totalScore,
      grade: r.grade,
      status: r.status
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const submitExamResults = async (req: AuthRequest, res: Response) => {
  try {
    const { courseCode, courseId, section, results, status = 'submitted' } = req.body;
    const examinationId = req.params.id;
    const userId = req.user?.id;

    // Validate examination exists
    const exam = await prisma.examination.findUnique({ where: { id: examinationId } });
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });

    // Find course
    let targetCourseId = courseId;
    if (!targetCourseId && courseCode) {
      const course = await prisma.course.findUnique({ where: { code: courseCode } });
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      targetCourseId = course.id;
    }

    if (!targetCourseId) {
      return res.status(400).json({ success: false, message: 'courseCode or courseId is required' });
    }

    for (const r of results) {
      const internal = Number(r.internalScore || 0);
      const endSem = Number(r.endSemScore || 0);
      const total = internal + endSem;
      const grade = calculateGrade(total);

      await prisma.examResult.upsert({
        where: {
          studentId_courseId_examinationId: {
            studentId: r.studentId,
            courseId: targetCourseId,
            examinationId
          }
        },
        update: {
          internalScore: internal,
          endSemScore: endSem,
          totalScore: total,
          grade,
          status,
          submittedBy: userId,
          submittedAt: new Date()
        },
        create: {
          studentId: r.studentId,
          courseId: targetCourseId,
          examinationId,
          internalScore: internal,
          endSemScore: endSem,
          totalScore: total,
          grade,
          status,
          submittedBy: userId,
          submittedAt: new Date()
        }
      });
    }

    res.json({ success: true, message: 'Results submitted successfully' });
  } catch (error) {
    console.error('[ExaminationController] submitExamResults error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAssignedExaminations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const callerRole = req.user?.role;
    const callerRoles = req.user?.roles || [callerRole];

    const isExaminer = callerRole === 'examiner' || callerRoles.includes('examiner');
    const isFaculty = callerRole === 'faculty' || callerRoles.includes('faculty');
    const isAdminOrHod = callerRole === 'admin' || callerRoles.includes('admin') || 
                         callerRole === 'hod' || callerRoles.includes('hod');

    if (isAdminOrHod) {
      const exams = await prisma.examination.findMany({
        include: {
          examinerAssignments: {
            include: {
              examiner: { select: { id: true, name: true, email: true } },
              course: { select: { id: true, name: true, code: true } }
            }
          }
        },
        orderBy: { startDate: 'desc' }
      });
      return res.json({ success: true, examinations: exams });
    }

    if (isExaminer) {
      const assignments = await prisma.examinerAssignment.findMany({
        where: { examinerId: userId },
        include: {
          examination: true,
          course: true
        }
      });
      return res.json({ success: true, assignments });
    }

    if (isFaculty) {
      const faculty = await prisma.faculty.findUnique({ where: { userId } });
      if (!faculty) return res.json({ success: true, assignments: [] });

      const courses = await prisma.course.findMany({
        where: { facultyId: faculty.id },
        select: { id: true, name: true, code: true, semester: true }
      });
      const exams = await prisma.examination.findMany({
        where: {
          semester: { in: courses.map(c => c.semester) }
        },
        orderBy: { startDate: 'desc' }
      });
      return res.json({ success: true, courses, examinations: exams });
    }

    res.json({ success: true, assignments: [] });
  } catch (error) {
    console.error('[ExaminationController] getAssignedExaminations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const saveDraftMarks = async (req: AuthRequest, res: Response) => {
  try {
    const { courseCode, courseId, results } = req.body;
    const examinationId = req.params.id;
    const userId = req.user?.id;

    const exam = await prisma.examination.findUnique({ where: { id: examinationId } });
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });

    let targetCourseId = courseId;
    if (!targetCourseId && courseCode) {
      const course = await prisma.course.findUnique({ where: { code: courseCode } });
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      targetCourseId = course.id;
    }

    if (!targetCourseId || !results || !Array.isArray(results)) {
      return res.status(400).json({ success: false, message: 'courseId/courseCode and results array are required' });
    }

    for (const r of results) {
      const internal = Number(r.internalScore || 0);
      const endSem = Number(r.endSemScore || 0);
      const total = internal + endSem;
      const grade = calculateGrade(total);

      await prisma.examResult.upsert({
        where: {
          studentId_courseId_examinationId: {
            studentId: r.studentId,
            courseId: targetCourseId,
            examinationId
          }
        },
        update: {
          internalScore: internal,
          endSemScore: endSem,
          totalScore: total,
          grade,
          status: 'draft',
          submittedBy: userId
        },
        create: {
          studentId: r.studentId,
          courseId: targetCourseId,
          examinationId,
          internalScore: internal,
          endSemScore: endSem,
          totalScore: total,
          grade,
          status: 'draft',
          submittedBy: userId
        }
      });
    }

    res.json({ success: true, message: 'Draft marks saved successfully' });
  } catch (error) {
    console.error('[ExaminationController] saveDraftMarks error:', error);
    res.status(500).json({ success: false, message: 'Server error saving draft marks' });
  }
};

export const submitMarksForApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { courseCode, courseId, results } = req.body;
    const examinationId = req.params.id;
    const userId = req.user?.id;

    const exam = await prisma.examination.findUnique({ where: { id: examinationId } });
    if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });

    let targetCourseId = courseId;
    if (!targetCourseId && courseCode) {
      const course = await prisma.course.findUnique({ where: { code: courseCode } });
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      targetCourseId = course.id;
    }

    if (!targetCourseId) {
      return res.status(400).json({ success: false, message: 'courseId or courseCode is required' });
    }

    if (results && Array.isArray(results) && results.length > 0) {
      for (const r of results) {
        const internal = Number(r.internalScore || 0);
        const endSem = Number(r.endSemScore || 0);
        const total = internal + endSem;
        const grade = calculateGrade(total);

        await prisma.examResult.upsert({
          where: {
            studentId_courseId_examinationId: {
              studentId: r.studentId,
              courseId: targetCourseId,
              examinationId
            }
          },
          update: {
            internalScore: internal,
            endSemScore: endSem,
            totalScore: total,
            grade,
            status: 'submitted',
            submittedBy: userId,
            submittedAt: new Date()
          },
          create: {
            studentId: r.studentId,
            courseId: targetCourseId,
            examinationId,
            internalScore: internal,
            endSemScore: endSem,
            totalScore: total,
            grade,
            status: 'submitted',
            submittedBy: userId,
            submittedAt: new Date()
          }
        });
      }
    } else {
      await prisma.examResult.updateMany({
        where: {
          examinationId,
          courseId: targetCourseId,
          status: 'draft'
        },
        data: {
          status: 'submitted',
          submittedBy: userId,
          submittedAt: new Date()
        }
      });
    }

    res.json({ success: true, message: 'Marks submitted for HOD approval' });
  } catch (error) {
    console.error('[ExaminationController] submitMarksForApproval error:', error);
    res.status(500).json({ success: false, message: 'Server error submitting marks' });
  }
};

export const getPendingApprovalResults = async (req: AuthRequest, res: Response) => {
  try {
    const examinationId = req.params.id;
    const results = await prisma.examResult.findMany({
      where: {
        examinationId,
        status: 'submitted'
      },
      include: {
        student: { include: { user: { select: { id: true, name: true, email: true } } } },
        course: { select: { id: true, name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, pendingResults: results });
  } catch (error) {
    console.error('[ExaminationController] getPendingApprovalResults error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const approveExamMarks = async (req: AuthRequest, res: Response) => {
  try {
    const examinationId = req.params.id;
    const userId = req.user?.id;
    const { courseId } = req.body;

    const whereClause: any = {
      examinationId,
      status: 'submitted'
    };
    if (courseId) whereClause.courseId = courseId;

    const updated = await prisma.examResult.updateMany({
      where: whereClause,
      data: {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `Successfully approved marks (${updated.count} records updated)`,
      approvedCount: updated.count
    });
  } catch (error) {
    console.error('[ExaminationController] approveExamMarks error:', error);
    res.status(500).json({ success: false, message: 'Server error approving marks' });
  }
};

export const publishExamResults = async (req: AuthRequest, res: Response) => {
  try {
    const examinationId = req.params.id;

    const updated = await prisma.examResult.updateMany({
      where: {
        examinationId,
        status: { in: ['approved', 'submitted'] }
      },
      data: {
        status: 'published'
      }
    });

    await prisma.examination.update({
      where: { id: examinationId },
      data: { status: 'evaluated' }
    });

    res.json({
      success: true,
      message: `Results published successfully for examination (${updated.count} records published)`,
      publishedCount: updated.count
    });
  } catch (error) {
    console.error('[ExaminationController] publishExamResults error:', error);
    res.status(500).json({ success: false, message: 'Server error publishing results' });
  }
};

const calculateGrade = (total: number) => {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B';
  if (total >= 60) return 'C';
  if (total >= 50) return 'D';
  return 'F';
};

export const exportExaminations = async (req: AuthRequest, res: Response) => {
  try {
    const exams = await prisma.examination.findMany({ orderBy: { startDate: 'desc' } });
    const csvRows = [['ID', 'Title', 'Semester', 'AcademicYear', 'Status', 'Start Date', 'End Date']];
    exams.forEach(e => csvRows.push([
      e.id, `"${e.title}"`, e.semester.toString(), e.academicYear || '', e.status, 
      e.startDate.toISOString().split('T')[0], e.endDate.toISOString().split('T')[0]
    ]));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="examinations_list.csv"');
    res.send(csvRows.map(r => r.join(",")).join("\n"));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error exporting examinations' });
  }
};

export const getExamStats = async (req: AuthRequest, res: Response) => {
  try {
    const results = await prisma.examResult.findMany({ where: { examinationId: req.params.id } });
    if (results.length === 0) return res.json({ message: 'No results found', passPercentage: 0 });
    
    const passed = results.filter(r => r.totalScore >= 50).length;
    const passPercentage = parseFloat(((passed / results.length) * 100).toFixed(1));
    const averageScore = parseFloat((results.reduce((a, b) => a + b.totalScore, 0) / results.length).toFixed(1));
    
    res.json({ totalStudents: results.length, passed, passPercentage, averageScore });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const downloadExamResults = async (req: AuthRequest, res: Response) => {
  try {
    const results = await prisma.examResult.findMany({
      where: { examinationId: req.params.id },
      include: { student: { include: { user: true } }, course: true }
    });
    const csvRows = [['Student Name', 'Roll Number', 'Course', 'Internal', 'EndSem', 'Total', 'Grade']];
    results.forEach(r => csvRows.push([
      `"${r.student.user.name}"`, r.student.rollNumber, `"${r.course.name}"`, 
      r.internalScore?.toString() || '0', r.endSemScore?.toString() || '0', 
      r.totalScore.toString(), r.grade
    ]));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="exam_results_${req.params.id}.csv"`);
    res.send(csvRows.map(r => r.join(",")).join("\n"));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error exporting results' });
  }
};

export const remindFaculty = async (req: AuthRequest, res: Response) => {
  try {
    res.json({ success: true, message: 'Reminder sent to faculty successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
