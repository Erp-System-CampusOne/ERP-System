import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getStudents,
  getFacultyList,
  getDepartments,
  getCourses,
  getNotices,
  getFeeStructures,
  getFeeTransactions,
  getFeeDefaulters,
  getExaminations,
  getInstitutionalOverview,
  createDepartment, updateDepartment, deleteDepartment,
  createStudent, updateStudent, deleteStudent,
  createFaculty, updateFaculty, deleteFaculty,
  createNotice, updateNotice, deleteNotice, pinNotice,
  createExamination, updateExamination, deleteExamination, releaseHallTickets, remindFaculty,
  createCourse, updateCourse, deleteCourse,
  updateRolePermissions,
  updateAdmissionStatus, saveTimetable,
  createAdminUser,
  getDocumentQueue, approveDocumentRequest, rejectDocumentRequest,
  getExaminers, assignExaminer,
  getDepartmentHods, relieveDepartmentHod
} from '@/api/apiCall';
import type { DepartmentInput } from '@/api/apiInterface';

export function useStudentsList() {
  return useQuery({
    queryKey: ['admin', 'students'],
    queryFn: async () => {
      return await getStudents({});
    },
  });
}

export function useStudentMutations() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: createStudent,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'students'] }),
    }),
    update: useMutation({
      mutationFn: updateStudent,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'students'] }),
    }),
    remove: useMutation({
      mutationFn: deleteStudent,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'students'] }),
    }),
  };
}

export function useFacultyList() {
  return useQuery({
    queryKey: ['admin', 'faculty'],
    queryFn: async () => {
      return await getFacultyList({});
    },
  });
}

export function useFacultyMutations() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: createFaculty,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'faculty'] }),
    }),
    update: useMutation({
      mutationFn: updateFaculty,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'faculty'] }),
    }),
    remove: useMutation({
      mutationFn: deleteFaculty,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'faculty'] }),
    }),
  };
}

export function useDepartments() {
  return useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      return await getDepartments();
    },
  });
}

export function useDepartmentMutations() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({ mutationFn: createDepartment, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] }) }),
    update: useMutation({ mutationFn: ({ id, ...input }: { id: string } & DepartmentInput) => updateDepartment(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] }) }),
    remove: useMutation({ mutationFn: deleteDepartment, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] }) }),
  };
}

export function useCourses() {
  return useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: async () => {
      return await getCourses({});
    },
  });
}

export function useCourseMutations() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: createCourse,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] }),
    }),
    update: useMutation({
      mutationFn: updateCourse,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] }),
    }),
    remove: useMutation({
      mutationFn: deleteCourse,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] }),
    }),
  };
}

export function useNotices() {
  return useQuery({
    queryKey: ['admin', 'notices'],
    queryFn: async () => {
      return await getNotices({});
    },
  });
}

export function useNoticeMutations() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: createNotice,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] }),
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof updateNotice>[1]) => updateNotice(id, input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] }),
    }),
    remove: useMutation({
      mutationFn: deleteNotice,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] }),
    }),
    pin: useMutation({
      mutationFn: pinNotice,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] }),
    }),
  };
}

export function useFeeStructures() {
  return useQuery({
    queryKey: ['admin', 'fee-structures'],
    queryFn: async () => {
      return await getFeeStructures();
    },
  });
}

export function useFeeTransactions() {
  return useQuery({
    queryKey: ['admin', 'fee-transactions'],
    queryFn: async () => {
      return await getFeeTransactions({});
    },
  });
}

export function useFeeDefaulters() {
  return useQuery({
    queryKey: ['admin', 'fee-defaulters'],
    queryFn: async () => {
      return await getFeeDefaulters({});
    },
  });
}

export function useExaminations() {
  return useQuery({
    queryKey: ['admin', 'examinations'],
    queryFn: async () => {
      return await getExaminations({});
    },
  });
}

export function useExaminationMutations() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: createExamination,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'examinations'] }),
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof updateExamination>[1]) => updateExamination(id, input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'examinations'] }),
    }),
    remove: useMutation({
      mutationFn: deleteExamination,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'examinations'] }),
    }),
    releaseHallTickets: useMutation({
      mutationFn: releaseHallTickets,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'examinations'] }),
    }),
    remindFaculty: useMutation({
      mutationFn: remindFaculty,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'examinations'] });
        alert("Reminder sent to faculty");
      }
    })
  };
}

export function useRoleMutations() {
  const queryClient = useQueryClient();
  return {
    updatePermissions: useMutation({
      mutationFn: ({ role, permissions }: { role: string; permissions: string[] }) => updateRolePermissions(role, { permissions }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] }),
    })
  };
}

export function useAdmissionMutations() {
  const queryClient = useQueryClient();
  return {
    updateStatus: useMutation({
      mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof updateAdmissionStatus>[1]) => updateAdmissionStatus(id, input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'admissions'] }),
    })
  };
}

export function useTimetableMutations() {
  const queryClient = useQueryClient();
  return {
    save: useMutation({
      mutationFn: saveTimetable,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'timetables'] }), // or whatever key is used
    })
  };
}

export function useInstitutionalMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => {
      return await getInstitutionalOverview();
    },
  });
}

export function useCreateAdminUser() {
  return useMutation({
    mutationFn: createAdminUser,
  });
}

export function useDocumentQueue(status?: string) {
  return useQuery({
    queryKey: ['admin', 'documentQueue', status],
    queryFn: async () => {
      const res = await getDocumentQueue(status);
      return res.documents || [];
    },
  });
}

export function useDocumentMutations() {
  const queryClient = useQueryClient();
  return {
    approve: useMutation({
      mutationFn: ({ id, documentUrl }: { id: string; documentUrl?: string }) => approveDocumentRequest(id, { documentUrl }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'documentQueue'] }),
    }),
    reject: useMutation({
      mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason: string }) => rejectDocumentRequest(id, { rejectionReason }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'documentQueue'] }),
    }),
  };
}

export function useExaminers() {
  return useQuery({
    queryKey: ['admin', 'examiners'],
    queryFn: async () => {
      const res = await getExaminers();
      return res.examiners || [];
    },
  });
}

export function useAssignExaminerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignExaminer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'examiners'] });
    },
  });
}

export function useDepartmentHods() {
  return useQuery({
    queryKey: ['admin', 'hods'],
    queryFn: async () => {
      const res = await getDepartmentHods();
      return res.departments || [];
    },
  });
}

export function useRelieveDepartmentHod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: relieveDepartmentHod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hods'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
    },
  });
}

