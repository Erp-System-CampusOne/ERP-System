import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BookOpen,
  User,
  CreditCard,
  FlaskConical,
  FileText,
  BookMarked,
  Building2,
  Mail,
  Briefcase,
  Info,
  AlertCircle,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStudentCourses, useCourseDetails } from '@/features/student/hooks';
import type { Course } from '@/api/apiInterface';
import { cn } from '@/lib/utils';

// ─── Animation variants ────────────────────────────────────────────────────

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ─── Type helpers ──────────────────────────────────────────────────────────

type CourseType = 'theory' | 'lab' | 'elective' | 'project';

const typeColors: Record<CourseType, string> = {
  theory: 'bg-blue-500',
  lab: 'bg-violet-500',
  elective: 'bg-amber-500',
  project: 'bg-emerald-500',
};

const typeBadgeColors: Record<CourseType, string> = {
  theory: 'bg-blue-100 text-blue-700',
  lab: 'bg-violet-100 text-violet-700',
  elective: 'bg-amber-100 text-amber-700',
  project: 'bg-emerald-100 text-emerald-700',
};

const typeIcons: Record<CourseType, React.ElementType> = {
  theory: BookOpen,
  lab: FlaskConical,
  elective: FileText,
  project: BookMarked,
};

function getCourseType(type?: string): CourseType | null {
  if (type && ['theory', 'lab', 'elective', 'project'].includes(type)) {
    return type as CourseType;
  }
  return null;
}

// ─── NA helper ────────────────────────────────────────────────────────────

function NA({ label }: { label: string }) {
  return (
    <span className="text-sm text-muted-foreground italic">{label} not available</span>
  );
}

// ─── CourseCard ────────────────────────────────────────────────────────────

function CourseCard({
  course,
  onSelect,
}: {
  course: Course;
  onSelect: (course: Course, triggerEl: HTMLElement) => void;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const courseType = getCourseType(course.type);
  const TypeIcon = courseType ? typeIcons[courseType] : BookOpen;
  const colorClass = courseType ? typeColors[courseType] : 'bg-blue-500';

  function handleClick() {
    if (cardRef.current) {
      onSelect(course, cardRef.current);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (cardRef.current) {
        onSelect(course, cardRef.current);
      }
    }
  }

  return (
    <motion.div variants={item}>
      <Card
        ref={cardRef}
        id={`course-card-${course.id}`}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${course.name} (${course.code})`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="border-2 border-border/60 bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer h-full select-none"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={cn('p-2.5 rounded-xl', colorClass)}>
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            {courseType && (
              <span
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-semibold',
                  typeBadgeColors[courseType],
                )}
              >
                {courseType.charAt(0).toUpperCase() + courseType.slice(1)}
              </span>
            )}
          </div>
          <CardTitle className="text-lg font-display mt-3">{course.code}</CardTitle>
          <CardDescription className="line-clamp-2">{course.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {course.facultyInstructor ?? 'Instructor not assigned'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{course.credits} Credits</span>
            </div>
            <span className="text-sm text-muted-foreground">Sem {course.semester}</span>
          </div>
          {course.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 pt-2 border-t">
              {course.description}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── CourseSkeleton ────────────────────────────────────────────────────────

function CourseSkeleton() {
  return (
    <Card className="border-2 border-border/60 bg-card animate-pulse h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div className="w-16 h-6 rounded-full bg-muted" />
        </div>
        <div className="h-6 w-24 bg-muted rounded mt-3" />
        <div className="h-4 w-full bg-muted rounded mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-4 w-1/2 bg-muted rounded" />
      </CardContent>
    </Card>
  );
}

// ─── CourseDetailSkeleton ──────────────────────────────────────────────────

function CourseDetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse pt-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-3/4 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── CourseInfoModal ───────────────────────────────────────────────────────

function CourseInfoModal({
  courseId,
  onClose,
  triggerRef,
}: {
  courseId: string | null;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}) {
  const { data: course, isLoading, error } = useCourseDetails(courseId);

  const courseType = getCourseType(course?.type);
  const TypeIcon = courseType ? typeIcons[courseType] : BookOpen;
  const colorClass = courseType ? typeColors[courseType] : 'bg-blue-500';

  return (
    <Dialog open={!!courseId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[calc(100%-2rem)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        onCloseAutoFocus={(e) => {
          if (triggerRef.current) {
            e.preventDefault();
            triggerRef.current.focus();
          }
        }}
      >
        {isLoading ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Loading course details…
              </DialogTitle>
              <DialogDescription>
                Please wait while we fetch the course information.
              </DialogDescription>
            </DialogHeader>
            <CourseDetailSkeleton />
          </>
        ) : error ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Failed to load details
              </DialogTitle>
              <DialogDescription>
                Unable to retrieve course information. Please try again.
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" onClick={onClose} className="mt-2 w-fit">
              Close
            </Button>
          </>
        ) : course ? (
          <>
            {/* Header */}
            <DialogHeader>
              <div className="flex items-start gap-4">
                <div className={cn('p-3 rounded-xl shrink-0', colorClass)}>
                  <TypeIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold text-muted-foreground">
                      {course.code}
                    </span>
                    {courseType && (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-semibold',
                          typeBadgeColors[courseType],
                        )}
                      >
                        {courseType.charAt(0).toUpperCase() + courseType.slice(1)}
                      </span>
                    )}
                  </div>
                  <DialogTitle className="font-display text-xl leading-snug">
                    {course.name}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {course.department} · Semester {course.semester} · {course.credits} Credits
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* Overview */}
              <section aria-labelledby="modal-section-overview">
                <h3
                  id="modal-section-overview"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"
                >
                  <Info className="w-3.5 h-3.5" />
                  Course Overview
                </h3>
                <div className="rounded-lg border bg-muted/30 p-4">
                  {course.description ? (
                    <p className="text-sm leading-relaxed">{course.description}</p>
                  ) : (
                    <NA label="Course description" />
                  )}
                </div>
              </section>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-semibold mt-0.5 break-words">{course.department}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Semester</p>
                  <p className="text-sm font-semibold mt-0.5">Semester {course.semester}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Credits</p>
                  <p className="text-sm font-semibold mt-0.5">{course.credits} Credits</p>
                </div>
              </div>

              {/* Instructor */}
              <section aria-labelledby="modal-section-instructor">
                <h3
                  id="modal-section-instructor"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  Instructor
                </h3>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  {course.facultyInstructor ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{course.facultyInstructor}</p>
                          {course.facultyDesignation && (
                            <p className="text-xs text-muted-foreground">
                              {course.facultyDesignation}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t">
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                          {course.facultyEmail ? (
                            <a
                              href={`mailto:${course.facultyEmail}`}
                              className="text-primary hover:underline truncate"
                            >
                              {course.facultyEmail}
                            </a>
                          ) : (
                            <NA label="Email" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          {course.facultyDepartment ? (
                            <span className="break-words">{course.facultyDepartment}</span>
                          ) : (
                            <NA label="Department" />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <NA label="Instructor" />
                  )}
                </div>
              </section>

              {/* Curriculum & Practical */}
              <section aria-labelledby="modal-section-curriculum">
                <h3
                  id="modal-section-curriculum"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Curriculum &amp; Practical
                </h3>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Syllabus Modules
                    </p>
                    <NA label="Syllabus modules" />
                  </div>
                  {courseType === 'lab' && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Lab / Practical Requirements
                      </p>
                      <NA label="Lab requirements" />
                    </div>
                  )}
                </div>
              </section>

              {/* Evaluation */}
              <section aria-labelledby="modal-section-evaluation">
                <h3
                  id="modal-section-evaluation"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Evaluation Scheme
                </h3>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Internal Assessment</span>
                    <NA label="Weightage" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">End-Semester Examination</span>
                    <NA label="Weightage" />
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Course Not Found</DialogTitle>
              <DialogDescription>The requested course details could not be found.</DialogDescription>
            </DialogHeader>
            <Button variant="outline" onClick={onClose} className="mt-2 w-fit">
              Close
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function StudentCourses() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  const { data: courses, isLoading, error } = useStudentCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const triggerElementRef = React.useRef<HTMLElement | null>(null);

  const handleSelectCourse = (course: Course, triggerEl: HTMLElement) => {
    triggerElementRef.current = triggerEl;
    setSelectedCourseId(course.id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight">My Courses</h1>
                  <p className="mt-1 text-muted-foreground">
                    View your enrolled courses and details
                  </p>
                </div>
              </div>
            </Wrapper>

            {/* Stats strip */}
            <Wrapper variants={item}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-5">
                    <span className="text-sm font-medium text-muted-foreground">Total Courses</span>
                    <div className="mt-2">
                      <span className="font-display text-3xl font-bold tracking-tight tabular-nums">
                        {isLoading ? '-' : courses?.length ?? 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-5">
                    <span className="text-sm font-medium text-muted-foreground">Theory</span>
                    <div className="mt-2">
                      <span className="font-display text-3xl font-bold tracking-tight tabular-nums text-blue-600">
                        {isLoading ? '-' : courses?.filter((c: Course) => c.type === 'theory').length ?? 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-5">
                    <span className="text-sm font-medium text-muted-foreground">Lab</span>
                    <div className="mt-2">
                      <span className="font-display text-3xl font-bold tracking-tight tabular-nums text-violet-600">
                        {isLoading ? '-' : courses?.filter((c: Course) => c.type === 'lab').length ?? 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-5">
                    <span className="text-sm font-medium text-muted-foreground">Total Credits</span>
                    <div className="mt-2">
                      <span className="font-display text-3xl font-bold tracking-tight tabular-nums">
                        {isLoading ? '-' : courses?.reduce((acc: number, c: Course) => acc + c.credits, 0) ?? 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      {/* Course grid */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {error ? (
          <Card className="border-2 border-destructive/60 bg-destructive/5">
            <CardContent className="p-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-destructive font-medium">
                Failed to load courses. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <CourseSkeleton key={i} />
            ))}
          </div>
        ) : courses?.length === 0 ? (
          <Card className="border-2 border-border/60">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Courses Enrolled</h3>
              <p className="mt-2 text-muted-foreground">
                You are not enrolled in any courses for this semester.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses?.map((course: Course) => (
              <CourseCard
                key={course.id}
                course={course}
                onSelect={handleSelectCourse}
              />
            ))}
          </div>
        )}
      </div>

      {/* Course info modal */}
      <CourseInfoModal
        courseId={selectedCourseId}
        onClose={() => setSelectedCourseId(null)}
        triggerRef={triggerElementRef}
      />
    </div>
  );
}

