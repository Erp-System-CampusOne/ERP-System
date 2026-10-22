import { Request, Response } from 'express';
import prisma from '../config/db';

export const getCourses = async (req: Request, res: Response) => {
  try {
    const { department, semester } = req.query;
    let whereClause: any = {};

    if (department) {
      // department param may be a name string or an ID — resolve to ID
      const dept = await prisma.department.findFirst({
        where: {
          OR: [
            { id: department as string },
            { name: { equals: department as string, mode: 'insensitive' } },
            { code: { equals: department as string, mode: 'insensitive' } },
          ]
        }
      });
      if (dept) whereClause.departmentId = dept.id;
      else whereClause.departmentId = department; // fall back to raw value
    }

    if (semester) whereClause.semester = parseInt(semester as string);

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: { department: true, faculty: { include: { user: true } } }
    });

    const formatted = courses.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      department: c.department.name,
      departmentId: c.departmentId,
      semester: c.semester,
      credits: c.credits,
      type: c.type,
      description: c.description,
      facultyId: c.facultyId,
      facultyInstructor: c.faculty?.user.name
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { code, name, department, departmentId, semester, credits, type, description, facultyId } = req.body;
    
    let resolvedDeptId = departmentId || department;
    if (resolvedDeptId) {
      const dept = await prisma.department.findFirst({
        where: {
          OR: [
            { id: resolvedDeptId },
            { name: { equals: resolvedDeptId, mode: 'insensitive' } },
            { code: { equals: resolvedDeptId, mode: 'insensitive' } }
          ]
        }
      });
      if (dept) resolvedDeptId = dept.id;
    }

    if (!resolvedDeptId) {
      const authUser = (req as any).user;
      if (authUser?.id) {
        const hodDept = await prisma.department.findFirst({
          where: {
            OR: [
              { headOfDepartment: { userId: authUser.id } },
              { faculty: { some: { userId: authUser.id } } }
            ]
          }
        });
        if (hodDept) resolvedDeptId = hodDept.id;
      }
    }

    if (!resolvedDeptId) {
      const firstDept = await prisma.department.findFirst();
      resolvedDeptId = firstDept?.id;
    }

    const course = await prisma.course.create({
      data: {
        code,
        name,
        departmentId: resolvedDeptId,
        semester: Number(semester) || 1,
        credits: Number(credits) || 3,
        type: type === 'lab' ? 'lab' : 'theory',
        description,
        facultyId: facultyId || null
      },
      include: { department: true, faculty: { include: { user: true } } }
    });
    
    res.status(201).json({
      id: course.id,
      code: course.code,
      name: course.name,
      department: course.department.name,
      departmentId: course.departmentId,
      semester: course.semester,
      credits: course.credits,
      type: course.type,
      description: course.description,
      facultyId: course.facultyId,
      facultyInstructor: course.faculty?.user.name
    });
  } catch (error) {
    console.error('Failed to create course:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        department: true,
        faculty: {
          include: {
            user: true,
            department: true,
          },
        },
      },
    });
    if (!course) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({
      id: course.id,
      code: course.code,
      name: course.name,
      department: course.department.name,
      departmentId: course.departmentId,
      semester: course.semester,
      credits: course.credits,
      type: course.type,
      description: course.description,
      facultyId: course.facultyId,
      facultyInstructor: course.faculty?.user.name ?? null,
      facultyEmail: course.faculty?.user.email ?? null,
      facultyDepartment: course.faculty?.department.name ?? null,
      facultyDesignation: course.faculty?.designation ?? null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { name, credits, type, description, facultyId, departmentId, semester } = req.body;
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(credits !== undefined && { credits: Number(credits) }),
        ...(type && { type: type === 'lab' ? 'lab' : 'theory' }),
        ...(description !== undefined && { description }),
        ...(facultyId !== undefined && { facultyId: facultyId || null }),
        ...(departmentId && { departmentId }),
        ...(semester !== undefined && { semester: Number(semester) })
      },
      include: { department: true, faculty: { include: { user: true } } }
    });
    res.json({
      id: course.id,
      code: course.code,
      name: course.name,
      department: course.department.name,
      departmentId: course.departmentId,
      semester: course.semester,
      credits: course.credits,
      type: course.type,
      description: course.description,
      facultyId: course.facultyId,
      facultyInstructor: course.faculty?.user.name
    });
  } catch (error) {
    console.error('Failed to update course:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const course = await prisma.course.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete course' });
  }
};
