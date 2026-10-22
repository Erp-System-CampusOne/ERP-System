import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Calendar,
  MapPin,
  Clock,
  User,
  AlertCircle,
  RefreshCw,
  Info,
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
import { useStudentTimetable, useCourseDetails } from '@/features/student/hooks';
import type { TimetableEntry } from '@/api/apiInterface';
import { cn } from '@/lib/utils';

// ─── Animation variants ────────────────────────────────────────────────────

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ─── Constants ─────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
type DayName = (typeof DAYS)[number];

const PERIODS = [1, 2, 3, 4, 5, 6, 7];

const TIME_SLOTS: Record<number, string> = {
  1: '09:00 - 09:55',
  2: '09:55 - 10:50',
  3: '10:50 - 11:45',
  4: '11:45 - 12:40',
  5: '01:30 - 02:25',
  6: '02:25 - 03:20',
  7: '03:20 - 04:15',
  8: '04:15 - 05:10',
};

// ─── Class Details Modal ───────────────────────────────────────────────────

function ClassDetailsModal({
  entry,
  onClose,
}: {
  entry: TimetableEntry | null;
  onClose: () => void;
}) {
  const { data: courseDetails } = useCourseDetails(entry?.courseId ?? null);

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        {entry ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary font-mono">
                  {entry.subjectCode}
                </span>
                {courseDetails?.type && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground capitalize">
                    {courseDetails.type}
                  </span>
                )}
                {courseDetails?.credits !== undefined && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {courseDetails.credits} Credits
                  </span>
                )}
              </div>
              <DialogTitle className="font-display text-xl leading-snug">
                {entry.subjectName || entry.subjectCode}
              </DialogTitle>
              <DialogDescription>
                Schedule & Room Assignment Details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Day & Period</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {entry.dayOfWeek}, Period {entry.period}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Time Slot</span>
                  </div>
                  <p className="text-xs font-semibold font-mono mt-0.5">
                    {entry.timeSlot || TIME_SLOTS[entry.period] || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Room</span>
                  </div>
                  <p className="text-sm font-semibold">{entry.roomNumber || 'Not assigned'}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Instructor</span>
                  </div>
                  <p className="text-sm font-semibold truncate">
                    {entry.facultyName || 'Instructor not assigned'}
                  </p>
                </div>
              </div>

              {courseDetails?.description && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    <span>Course Overview</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {courseDetails.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Class Not Found</DialogTitle>
              <DialogDescription>No details available for this class.</DialogDescription>
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

// ─── TimetableCell ─────────────────────────────────────────────────────────

function TimetableCell({
  entry,
  day,
  period,
  onSelect,
}: {
  entry: TimetableEntry | null;
  day: string;
  period: number;
  onSelect: (entry: TimetableEntry) => void;
}) {
  if (!entry) {
    return (
      <div
        className="min-h-[58px] p-2 rounded-lg bg-muted/15 border border-dashed border-border/40 flex items-center justify-center transition-colors"
        aria-hidden="true"
      >
        <span className="text-[10px] text-muted-foreground/30 font-mono">-</span>
      </div>
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(entry!);
    }
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`Class ${entry.subjectCode}: ${entry.subjectName || ''}, ${day} Period ${period}, Room ${entry.roomNumber}`}
      onClick={() => onSelect(entry)}
      onKeyDown={handleKeyDown}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[58px] p-2 rounded-lg bg-primary/10 border-2 border-primary/30 hover:border-primary/60 hover:bg-primary/15 transition-all cursor-pointer group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none text-left"
    >
      <div>
        <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors leading-tight">
          {entry.subjectCode}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-tight mt-0.5">
          {entry.subjectName || entry.subjectCode}
        </p>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1 pt-1 border-t border-primary/10">
        <span className="flex items-center gap-1 font-medium">
          <MapPin className="w-2.5 h-2.5 shrink-0 text-primary" />
          {entry.roomNumber}
        </span>
        {entry.facultyName && (
          <span
            className="truncate max-w-[65px] text-[10px] text-muted-foreground/80 hidden xl:inline"
            title={entry.facultyName}
          >
            {entry.facultyName}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── TimetableSkeleton ─────────────────────────────────────────────────────

function TimetableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-7 gap-2">
        <div className="h-10 bg-muted/40 rounded-lg" />
        {DAYS.map((day) => (
          <div key={day} className="h-10 bg-muted/40 rounded-lg" />
        ))}
      </div>
      {PERIODS.map((p) => (
        <div key={p} className="grid grid-cols-7 gap-2">
          <div className="h-[58px] bg-muted/30 rounded-lg" />
          {DAYS.map((d) => (
            <div key={`${d}-${p}`} className="h-[58px] bg-muted/20 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function StudentTimetable() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  const { data: timetable, isLoading, error, refetch } = useStudentTimetable();

  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [mobileDay, setMobileDay] = useState<DayName>('Monday');

  const timetableMap = useMemo(() => {
    if (!timetable?.entries) return {};
    const map: Record<string, TimetableEntry> = {};
    timetable.entries.forEach((entry: TimetableEntry) => {
      const key = `${entry.dayOfWeek}-${entry.period}`;
      map[key] = entry;
    });
    return map;
  }, [timetable]);

  const mobileEntries = useMemo(() => {
    if (!timetable?.entries) return [];
    return timetable.entries
      .filter((e) => e.dayOfWeek === mobileDay)
      .sort((a, b) => a.period - b.period);
  }, [timetable, mobileDay]);

  const totalClasses = timetable?.entries?.length ?? 0;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header banner */}
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show">
            <Wrapper variants={item}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                    Timetable
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Weekly class schedule and room assignments
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Semester {timetable?.semester ?? '-'} · Section {timetable?.section ?? '-'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-medium px-2.5 py-1 rounded-md bg-muted">
                    {totalClasses} {totalClasses === 1 ? 'class' : 'classes'} scheduled
                  </div>
                </div>
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {/* Error state */}
        {error ? (
          <Card className="border-2 border-destructive/60 bg-destructive/5">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                <div>
                  <p className="text-destructive font-medium">Failed to load timetable</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Unable to fetch your class schedule. Please check your connection and retry.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2 shrink-0 border-destructive/30 hover:bg-destructive/10"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          /* Loading state */
          <Card className="border-2 border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <TimetableSkeleton />
            </CardContent>
          </Card>
        ) : totalClasses === 0 ? (
          /* Genuinely empty timetable state */
          <Card className="border-2 border-border/60">
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold">No Classes Scheduled</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                There are no scheduled timetable entries for Semester {timetable?.semester ?? 1} · Section {timetable?.section ?? 'A'} at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Populated timetable */
          <Card className="border-2 border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-display">Weekly Schedule</CardTitle>
                  <CardDescription>
                    Click any scheduled class to view details and instructor information
                  </CardDescription>
                </div>
              </div>

              {/* Mobile day tabs switcher */}
              <div className="flex sm:hidden overflow-x-auto gap-1.5 pt-3 pb-1 border-t mt-3">
                {DAYS.map((day) => {
                  const dayHasClasses = timetable?.entries?.some((e) => e.dayOfWeek === day);
                  const isSelected = mobileDay === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setMobileDay(day)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <span>{day.slice(0, 3)}</span>
                      {dayHasClasses && (
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            isSelected ? 'bg-primary-foreground' : 'bg-primary',
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent>
              {/* Mobile list view */}
              <div className="sm:hidden space-y-3">
                <div className="flex items-center justify-between pb-1 border-b">
                  <h3 className="font-semibold text-sm">{mobileDay}</h3>
                  <span className="text-xs text-muted-foreground">
                    {mobileEntries.length} {mobileEntries.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>
                {mobileEntries.length === 0 ? (
                  <div className="p-8 text-center rounded-lg border border-dashed border-border/60 bg-muted/10">
                    <p className="text-sm text-muted-foreground">No classes scheduled for {mobileDay}.</p>
                  </div>
                ) : (
                  mobileEntries.map((entry) => (
                    <motion.div
                      key={entry.id || `${entry.dayOfWeek}-${entry.period}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedEntry(entry)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedEntry(entry);
                        }
                      }}
                      className="p-3.5 rounded-xl border-2 border-primary/20 bg-primary/5 hover:border-primary/50 transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary/15 text-primary">
                              {entry.subjectCode}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              Period {entry.period}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm mt-1 leading-snug">
                            {entry.subjectName || entry.subjectCode}
                          </h4>
                        </div>
                        <span className="px-2 py-1 rounded-md bg-background border text-[11px] font-mono shrink-0">
                          {entry.timeSlot || TIME_SLOTS[entry.period]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-primary/10">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary shrink-0" />
                          {entry.roomNumber}
                        </span>
                        {entry.facultyName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 shrink-0" />
                            {entry.facultyName}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Desktop 7-column weekly matrix view */}
              <div className="hidden sm:block overflow-x-auto">
                <div className="min-w-[720px]">
                  {/* Day header row */}
                  <div className="grid grid-cols-7 gap-2 pb-2">
                    <div className="p-2 text-center rounded-lg bg-muted/40 flex items-center justify-center">
                      <span className="text-xs font-semibold text-muted-foreground">Period</span>
                    </div>
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        className="text-center p-2 bg-muted/30 rounded-lg border border-border/40"
                      >
                        <span className="font-semibold text-xs text-foreground">{day}</span>
                      </div>
                    ))}
                  </div>

                  {/* Period rows */}
                  <div className="space-y-2">
                    {PERIODS.map((period) => (
                      <div key={period} className="grid grid-cols-7 gap-2 items-stretch">
                        {/* Period label column */}
                        <div className="flex flex-col items-center justify-center p-1.5 bg-muted/20 rounded-lg border border-border/30 min-h-[58px]">
                          <span className="text-xs font-bold font-mono text-foreground">
                            P{period}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono text-center leading-tight mt-0.5">
                            {TIME_SLOTS[period]?.split(' - ')[0]}
                          </span>
                        </div>

                        {/* Day cells */}
                        {DAYS.map((day) => (
                          <TimetableCell
                            key={`${day}-${period}`}
                            entry={timetableMap[`${day}-${period}`] || null}
                            day={day}
                            period={period}
                            onSelect={(entry) => setSelectedEntry(entry)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Class details dialog */}
      <ClassDetailsModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
