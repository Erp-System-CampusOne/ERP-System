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
      facultyName: e.faculty.user.name,
      roomNumber: e.roomNumber,
      section: e.section,
      semester: e.semester,
      courseId: e.courseId,
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
      facultyName: e.faculty.user.name,
      roomNumber: e.roomNumber,
      section: e.section,
      semester: e.semester,
      courseId: e.courseId,
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
    const { department, semester, section, entries } = req.body;
    
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
    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'Department not found' });
    }
    
    // First, delete existing entries for this section/semester/department
    const deleteWhere: any = {};
    if (semester) deleteWhere.semester = parseInt(semester);
    if (section) deleteWhere.section = section;
    if (departmentId) deleteWhere.departmentId = departmentId;
    
    if (Object.keys(deleteWhere).length > 0) {
      await prisma.timetableEntry.deleteMany({
        where: deleteWhere
      });
    }

    // Now insert new entries
    // Note: Assuming `entries` is an array of objects matching the necessary structure
    if (entries && Array.isArray(entries)) {
      const dataToInsert = entries.map((e: any) => ({
        courseId: e.courseId, // ensure frontend sends courseId
        facultyId: e.facultyId, // ensure frontend sends facultyId
        departmentId: departmentId,
        semester: semester ? parseInt(semester) : 1,
        section: section || 'A',
        dayOfWeek: e.dayOfWeek,
        period: e.period,
        timeSlot: e.timeSlot,
        roomNumber: e.roomNumber
      }));
      
      await prisma.timetableEntry.createMany({
        data: dataToInsert
      });
    }

    res.json({ success: true, message: 'Timetable saved successfully' });
  } catch (error) {
    console.error('Failed to save timetable', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
