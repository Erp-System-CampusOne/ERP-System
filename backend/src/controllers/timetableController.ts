import { Request, Response } from 'express';
import prisma from '../config/db';

export const getTimetables = async (req: Request, res: Response) => {
  try {
    const { section, semester, department, facultyId } = req.query;

    const whereClause: any = {};
    if (section) whereClause.section = section as string;
    if (semester) whereClause.semester = parseInt(semester as string);
    if (facultyId) whereClause.facultyId = facultyId as string;

    if (department) {
      const dept = await prisma.department.findFirst({
        where: {
          OR: [
            { id: department as string },
            { name: { equals: department as string, mode: 'insensitive' } },
            { code: { equals: department as string, mode: 'insensitive' } },
          ]
        }
      });
      if (dept) {
        whereClause.departmentId = dept.id;
      }
    }

    const entries = await prisma.timetableEntry.findMany({
      where: whereClause,
      include: {
        course: true,
        faculty: { include: { user: true } }
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }]
    });

    const formatted = entries.map(e => ({
      id: e.id,
      dayOfWeek: e.dayOfWeek,
      period: e.period,
      timeSlot: e.timeSlot,
      subjectCode: e.course.code,
      subjectName: e.course.name,
      facultyId: e.facultyId,
      facultyName: e.faculty.user.name,
      roomNumber: e.roomNumber,
      section: e.section,
      semester: e.semester,
    }));

    res.json({
      section: (section as string) || (entries[0]?.section ?? 'A'),
      semester: semester ? parseInt(semester as string) : (entries[0]?.semester ?? 1),
      entries: formatted
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const generateTimetable = async (req: Request, res: Response) => {
  try {
    const { department, semester, sections } = req.body;

    let departmentId: string | undefined;
    if (department) {
      const dept = await prisma.department.findFirst({
        where: {
          OR: [
            { id: department },
            { name: { equals: department, mode: 'insensitive' } },
            { code: { equals: department, mode: 'insensitive' } },
          ]
        }
      });
      departmentId = dept?.id;
    }

    const whereClause: any = {};
    if (semester) whereClause.semester = parseInt(semester);
    if (sections && sections.length > 0) whereClause.section = { in: sections };
    if (departmentId) whereClause.departmentId = departmentId;

    const entries = await prisma.timetableEntry.findMany({
      where: whereClause,
      include: {
        course: true,
        faculty: { include: { user: true } }
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }]
    });

    const formatted = entries.map(e => ({
      id: e.id,
      dayOfWeek: e.dayOfWeek,
      period: e.period,
      timeSlot: e.timeSlot,
      subjectCode: e.course.code,
      subjectName: e.course.name,
      facultyId: e.facultyId,
      facultyName: e.faculty.user.name,
      roomNumber: e.roomNumber,
      section: e.section,
      semester: e.semester,
    }));

    res.json({
      section: sections ? sections[0] : 'A',
      semester: semester || 1,
      entries: formatted
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const saveTimetable = async (req: Request, res: Response) => {
  try {
    const callerId = (req as any).user?.id;
    const callerRole = (req as any).user?.role;
    const callerRoles: string[] = (req as any).user?.roles || [];
    const isCallerAdmin = callerRole === 'admin' || callerRoles.includes('admin');

    const { department, semester, section, entries } = req.body;
    
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required' });
    }

    let departmentId: string | undefined;
    const dept = await prisma.department.findFirst({
      where: {
        OR: [
          { id: department },
          { name: { equals: department, mode: 'insensitive' } },
          { code: { equals: department, mode: 'insensitive' } },
        ]
      }
    });
    departmentId = dept?.id;
    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'Department not found' });
    }

    // Authorization: HOD may only save timetable for their assigned department
    if (!isCallerAdmin && callerId) {
      const hodDept = await prisma.department.findFirst({
        where: {
          OR: [
            { headOfDepartment: { userId: callerId } },
            { faculty: { some: { userId: callerId } } }
          ]
        }
      });
      if (!hodDept || hodDept.id !== departmentId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You only have permission to modify timetables for your assigned department'
        });
      }
    }

    if (!Array.isArray(entries)) {
      return res.status(400).json({ success: false, message: 'Entries must be an array' });
    }

    const parsedSemester = semester ? parseInt(semester) : 1;
    const targetSection = section || 'A';

    // Fetch department courses and faculties for lookup & validation
    const deptCourses = await prisma.course.findMany({
      where: { departmentId: departmentId },
      select: { id: true, code: true, name: true, facultyId: true }
    });
    const courseMap = new Map(deptCourses.map(c => [c.id, c]));

    const deptFaculties = await prisma.faculty.findMany({
      where: { departmentId: departmentId },
      include: { user: true }
    });
    const facultyMap = new Map(deptFaculties.map(f => [f.id, f]));

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dataToInsert: any[] = [];

    // Pre-validate all entries BEFORE modifying the database
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];

      const rawDay = (e.dayOfWeek || '').toString().trim();
      const normalizedDay = validDays.find(d => d.toLowerCase() === rawDay.toLowerCase());
      if (!normalizedDay) {
        return res.status(400).json({
          success: false,
          message: `Invalid day of week "${e.dayOfWeek}" at entry ${i + 1}. Must be Monday through Saturday.`
        });
      }

      const period = Number(e.period);
      if (!Number.isInteger(period) || period < 1 || period > 10) {
        return res.status(400).json({
          success: false,
          message: `Invalid period "${e.period}" at entry ${i + 1}. Must be an integer between 1 and 10.`
        });
      }

      if (!e.courseId) {
        return res.status(400).json({
          success: false,
          message: `Missing course assignment for entry on ${normalizedDay}, Period ${period}.`
        });
      }

      // Resolve faculty ID through multiple safe fallbacks:
      // 1. Direct e.facultyId
      // 2. e.faculty if string ID or e.faculty.id
      // 3. Fallback to course.facultyId
      // 4. Fallback matching facultyName against department faculty
      let resolvedFacultyId = e.facultyId;
      if (!resolvedFacultyId && typeof e.faculty === 'string' && facultyMap.has(e.faculty)) {
        resolvedFacultyId = e.faculty;
      } else if (!resolvedFacultyId && e.faculty?.id) {
        resolvedFacultyId = e.faculty.id;
      }

      if (!resolvedFacultyId) {
        const course = courseMap.get(e.courseId);
        if (course?.facultyId) {
          resolvedFacultyId = course.facultyId;
        }
      }

      if (!resolvedFacultyId && e.facultyName) {
        const matched = deptFaculties.find(
          f => f.user?.name?.toLowerCase() === e.facultyName.toString().toLowerCase()
        );
        if (matched) {
          resolvedFacultyId = matched.id;
        }
      }

      // Requirement 5: Validate missing faculty assignments before calling Prisma
      if (!resolvedFacultyId) {
        const course = courseMap.get(e.courseId);
        const courseLabel = course ? `${course.code} - ${course.name}` : `Course (${e.courseId})`;
        return res.status(400).json({
          success: false,
          message: `Missing faculty assignment for ${courseLabel} on ${normalizedDay}, Period ${period}. Please assign a faculty instructor.`
        });
      }

      dataToInsert.push({
        courseId: e.courseId,
        facultyId: resolvedFacultyId,
        departmentId: departmentId,
        semester: parsedSemester,
        section: targetSection,
        dayOfWeek: normalizedDay as any,
        period: period,
        timeSlot: e.timeSlot || '',
        roomNumber: e.roomNumber || 'LH-101'
      });
    }

    // Atomic transaction: replace entries for this specific section/semester/dept
    await prisma.$transaction(async (tx) => {
      await tx.timetableEntry.deleteMany({
        where: {
          departmentId: departmentId,
          semester: parsedSemester,
          section: targetSection
        }
      });

      if (dataToInsert.length > 0) {
        await tx.timetableEntry.createMany({
          data: dataToInsert
        });
      }
    });

    res.json({
      success: true,
      message: `Timetable for Semester ${parsedSemester} Section ${targetSection} saved successfully (${dataToInsert.length} lectures scheduled)`,
      count: dataToInsert.length
    });
  } catch (error: any) {
    console.error('Failed to save timetable', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteTimetableEntry = async (req: Request, res: Response) => {
  try {
    const callerId = (req as any).user?.id;
    const callerRole = (req as any).user?.role;
    const callerRoles: string[] = (req as any).user?.roles || [];
    const isCallerAdmin = callerRole === 'admin' || callerRoles.includes('admin');
    const isCallerHod = callerRole === 'hod' || callerRoles.includes('hod');

    if (!callerId || (!isCallerAdmin && !isCallerHod)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
    }

    const { id } = req.params;
    const fallbackId = (req.body?.id as string) || (req.query?.id as string);
    const targetId = id || fallbackId;

    let entryToDelete: any = null;

    if (targetId) {
      entryToDelete = await prisma.timetableEntry.findUnique({
        where: { id: targetId },
        include: {
          course: true,
          faculty: { include: { user: true } },
          department: true,
        }
      });
    } else {
      // Fallback: lookup by unique combination
      const { dayOfWeek, period, semester, section, department } = { ...req.query, ...req.body };
      if (dayOfWeek && period && semester && section && department) {
        const dept = await prisma.department.findFirst({
          where: {
            OR: [
              { id: department as string },
              { name: { equals: department as string, mode: 'insensitive' } },
              { code: { equals: department as string, mode: 'insensitive' } },
            ]
          }
        });
        if (dept) {
          entryToDelete = await prisma.timetableEntry.findFirst({
            where: {
              dayOfWeek: dayOfWeek as any,
              period: Number(period),
              semester: Number(semester),
              section: String(section),
              departmentId: dept.id,
            },
            include: {
              course: true,
              faculty: { include: { user: true } },
              department: true,
            }
          });
        }
      }
    }

    if (!entryToDelete) {
      return res.status(404).json({ success: false, message: 'Timetable lecture entry not found' });
    }

    // Authorization check for HOD:
    // HOD may only delete entries within their assigned department
    if (!isCallerAdmin) {
      const hodDept = await prisma.department.findFirst({
        where: {
          OR: [
            { headOfDepartment: { userId: callerId } },
            { faculty: { some: { userId: callerId } } }
          ]
        }
      });

      if (!hodDept || hodDept.id !== entryToDelete.departmentId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You only have permission to delete timetable lectures within your assigned department'
        });
      }
    }

    // Safe deletion: Delete ONLY the selected timetable entry
    await prisma.timetableEntry.delete({
      where: { id: entryToDelete.id }
    });

    return res.json({
      success: true,
      message: 'Lecture deleted successfully from timetable',
      deletedEntry: {
        id: entryToDelete.id,
        courseCode: entryToDelete.course?.code,
        courseName: entryToDelete.course?.name,
        facultyName: entryToDelete.faculty?.user?.name,
        dayOfWeek: entryToDelete.dayOfWeek,
        period: entryToDelete.period,
        roomNumber: entryToDelete.roomNumber,
        semester: entryToDelete.semester,
        section: entryToDelete.section,
      }
    });
  } catch (error: any) {
    console.error('Failed to delete timetable entry:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting timetable lecture' });
  }
};

export const exportTimetable = async (req: Request, res: Response) => {
  try {
    const { department, semester, section } = req.query;
    if (!department || !semester || !section) {
      return res.status(400).json({ success: false, message: 'Missing department, semester, or section' });
    }

    const dept = await prisma.department.findFirst({ where: { name: department as string } });
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const entries = await prisma.timetableEntry.findMany({
      where: {
        departmentId: dept.id,
        semester: Number(semester),
        section: section as string
      },
      include: { course: true, faculty: { include: { user: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }]
    });

    const csvRows = [
      ['Day', 'Period', 'TimeSlot', 'Course Code', 'Course Name', 'Faculty', 'Room', 'Section']
    ];

    entries.forEach(e => {
      csvRows.push([
        e.dayOfWeek,
        e.period.toString(),
        e.timeSlot,
        e.course.code,
        `"${e.course.name}"`,
        `"${e.faculty.user?.name || e.faculty.employeeCode}"`,
        e.roomNumber,
        e.section
      ]);
    });

    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="timetable_${department}_S${semester}_Sec${section}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error generating timetable export' });
  }
};
