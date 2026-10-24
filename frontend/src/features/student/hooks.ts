import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getLibraryCirculation, getAllExaminations } from '@/api/customApi';
import {
  getStudentById,
  getStudentAttendance,
  getStudentGrades,
  getStudentFees,
  getCourses,
  getCourseById,
  getTimetables,
  getNotices,
  getStudentDocuments,
  recordFeePayment,
} from '@/api/apiCall';
import type { Examination, CirculationRecord, PaymentInput } from '@/api/apiInterface';

type ProfileUser = {
  studentProfile?: {
    id?: string;
  };
};

function getStudentId(user: unknown) {
  return (user as ProfileUser | null | undefined)?.studentProfile?.id;
}

export function useStudentProfile() {
  const { user } = useAuth();
  const studentId = getStudentId(user);

  return useQuery({
    queryKey: ['student', 'profile', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('No student profile found');
      return await getStudentById({ id: studentId });
    },
    enabled: !!studentId,
  });
}

export function useStudentAttendance() {
  const { user } = useAuth();
  const studentId = getStudentId(user);

  return useQuery({
    queryKey: ['student', 'attendance', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('No student profile found');
      return await getStudentAttendance({ id: studentId });
    },
    enabled: !!studentId,
  });
}

export function useStudentGrades() {
  const { user } = useAuth();
  const studentId = getStudentId(user);

  return useQuery({
    queryKey: ['student', 'grades', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('No student profile found');
      return await getStudentGrades({ id: studentId });
    },
    enabled: !!studentId,
  });
}

export function useStudentFees() {
  const { user } = useAuth();
  const studentId = getStudentId(user);

  return useQuery({
    queryKey: ['student', 'fees', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('No student profile found');
      return await getStudentFees({ id: studentId });
    },
    enabled: !!studentId,
  });
}

export function useSubmitStudentFeePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentInput) => recordFeePayment(input),
    onSuccess: (_transaction, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', 'fees', variables.studentId] });
    },
  });
}

export function useStudentCourses() {
  const { data: profile } = useStudentProfile();
  
  return useQuery({
    queryKey: ['student', 'courses', profile?.department, profile?.semester],
    queryFn: async () => {
      // Pass the name of the department as department filter if needed, 
      // but API seems to expect ID or Name. Assuming the backend handles it.
      return await getCourses({ department: profile?.department, semester: profile?.semester });
    },
    enabled: !!profile,
  });
}

export function useCourseDetails(courseId: string | null) {
  return useQuery({
    queryKey: ['course', 'details', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('No course id');
      return await getCourseById({ id: courseId });
    },
    enabled: !!courseId,
  });
}

export function useStudentTimetable() {
  const { data: profile } = useStudentProfile();

  return useQuery({
    queryKey: ['student', 'timetable', profile?.section, profile?.semester, profile?.department],
    queryFn: async () => {
      return await getTimetables({
        section: profile?.section,
        semester: profile?.semester,
        department: profile?.department,
      });
    },
    enabled: !!profile?.section && !!profile?.semester,
  });
}

export function useNotices() {
  return useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      return await getNotices({ targetRole: 'student' });
    },
  });
}

export function useStudentLibrary() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['student', 'library', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const data = await getLibraryCirculation(user.id);
      return (data || []) as CirculationRecord[];
    },
    enabled: !!user?.id,
  });
}

export function useExaminations() {
  return useQuery({
    queryKey: ['examinations'],
    queryFn: async () => {
      const data = await getAllExaminations();
      return (data || []) as Examination[];
    },
  });
}

export function useStudentDocuments() {
  const { user } = useAuth();
  const studentId = getStudentId(user);

  return useQuery({
    queryKey: ['student', 'documents', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('No student profile found');
      return await getStudentDocuments({ id: studentId });
    },
    enabled: !!studentId,
  });
}

export function useRequestDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const studentId = getStudentId(user);

  return useMutation({
    mutationFn: async ({ documentName, purpose }: { documentName: string; purpose?: string }) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ documentName, purpose, studentId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to request document');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'documents', studentId] });
    },
  });
}

