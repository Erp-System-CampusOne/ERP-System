import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Bell, Plus, Search, Calendar, AlertTriangle, Pin, Edit,
  Trash2, X
} from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNotices, useNoticeMutations } from '@/features/admin/hooks';
import { cn } from '@/lib/utils';
import type { Notice as ApiNotice } from '@/api/apiInterface';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function getCategoryColor(category?: string) {
  switch (category) {
    case 'examination': return 'bg-warning text-warning-foreground border-warning';
    case 'events': return 'bg-primary/10 text-primary border-primary/20';
    case 'academic': return 'bg-info text-info-foreground border-info';
    case 'fee': return 'bg-success text-success-foreground border-success';
    case 'general': return 'bg-muted text-muted-foreground border-border';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function NoticeSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-muted rounded-lg" />
      ))}
    </div>
  );
}

export default function AdminNotices() {
  const reduceMotion = useReducedMotion();
  const Wrapper = reduceMotion ? 'div' : motion.div;
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    category: 'general' as 'general' | 'academic' | 'examination' | 'events' | 'fee',
    targetRole: 'all' as 'all' | 'student' | 'faculty' | 'hod',
    isUrgent: false,
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNoticeId, setEditNoticeId] = useState<string | null>(null);

  const noticeMutations = useNoticeMutations();
  const { data: noticesData, isLoading, error } = useNotices();
  const allNotices = (Array.isArray(noticesData) ? noticesData : []) as ApiNotice[];

  const handleCreateNotice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNotice.title || !newNotice.content) return;
    try {
      await noticeMutations.create.mutateAsync(newNotice);
      setShowCreateModal(false);
      setNewNotice({
        title: '', content: '', category: 'general', targetRole: 'all', isUrgent: false,
      });
    } catch (err) {
      console.error('Failed to create notice:', err);
      alert('Failed to create notice. Please try again.');
    }
  };

  const handleEditNotice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editNoticeId || !newNotice.title || !newNotice.content) return;
    try {
      await noticeMutations.update.mutateAsync({
        id: editNoticeId,
        ...newNotice
      });
      setShowEditModal(false);
      setEditNoticeId(null);
    } catch (err) {
      console.error('Failed to update notice:', err);
      alert('Failed to update notice. Please try again.');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      await noticeMutations.remove.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete notice:', err);
      alert('Failed to delete notice.');
    }
  };

  const openEditModal = (notice: ApiNotice) => {
    setEditNoticeId(notice.id);
    setNewNotice({
      title: notice.title || '',
      content: notice.content || '',
      category: (notice.category || 'general') as any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
      targetRole: (notice.targetRole || 'all') as any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
      isUrgent: !!notice.isUrgent,
    });
    setShowEditModal(true);
  };

  const filteredNotices = allNotices.filter((notice) => {
    const matchesSearch = notice.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || notice.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const urgentNotices = allNotices.filter((n) => n.isUrgent);

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto mt-20 border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">Failed to load notices</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 border-border/60 bg-gradient-to-r from-destructive/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <Wrapper variants={container} initial="hidden" animate="show" className="space-y-5">
            <Wrapper variants={item}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-destructive">
                    <Bell className="w-6 h-6 text-background" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-bold tracking-tight">Campus Notices</h1>
                    <p className="text-sm text-muted-foreground">Manage announcements and circulars</p>
                  </div>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create Notice
                </Button>
              </div>
            </Wrapper>

            <Wrapper variants={item}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Notices</p>
                    <p className="font-display text-2xl font-bold tabular-nums">{allNotices.length}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Urgent</p>
                    <p className="font-display text-2xl font-bold tabular-nums text-destructive">{urgentNotices.length}</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-border/60 bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Published Today</p>
                    <p className="font-display text-2xl font-bold tabular-nums text-success">
                      {allNotices.filter(n => new Date(n.publishedAt).toDateString() === new Date().toDateString()).length}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </Wrapper>
          </Wrapper>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="border-2 border-border/60">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-display">All Notices</CardTitle>
                    <CardDescription>{filteredNotices.length} notices</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search notices..."
                        className="pl-9 w-full sm:w-48"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <select
                      className="h-10 rounded-lg border-2 border-input bg-background px-3 text-sm"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      <option value="academic">Academic</option>
                      <option value="examination">Examination</option>
                      <option value="events">Events</option>
                      <option value="fee">Fee</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <NoticeSkeleton />
                ) : (
                  <Wrapper variants={container} initial="hidden" animate="show">
                    <div className="space-y-4">
                      {filteredNotices.map((notice) => (
                        <motion.div
                          key={notice.id}
                          variants={item}
                          className={cn(
                            "p-4 rounded-xl border-2 bg-card transition-all hover:shadow-md",
                            notice.isUrgent ? "border-destructive/30" : "border-border/60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {notice.isUrgent && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
                                    <AlertTriangle className="w-3 h-3 mr-1" /> Urgent
                                  </span>
                                )}
                                <span className={cn(
                                  "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border",
                                  getCategoryColor(notice.category)
                                )}>
                                  {notice.category ? notice.category.charAt(0).toUpperCase() + notice.category.slice(1) : 'General'}
                                </span>
                              </div>
                              <h3 className="font-display font-semibold mt-2">{notice.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notice.content}</p>
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {format(new Date(notice.publishedAt), 'MMM d, yyyy')}
                                </span>
                                <span>By {notice.publishedBy}</span>
                                <span className="px-2 py-0.5 rounded bg-secondary">{notice.targetRole}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`h-8 w-8 ${notice.isPinned ? 'text-primary' : ''}`}
                                onClick={() => noticeMutations.pin.mutate(notice.id)}
                              >
                                <Pin className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEditModal(notice as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDeleteNotice(notice.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </Wrapper>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <CardTitle className="text-base font-display">Urgent Notices</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {urgentNotices.slice(0, 3).map((notice) => (
                    <div key={notice.id} className="p-3 rounded-lg bg-destructive/5 border-l-4 border-destructive">
                      <p className="font-medium text-sm line-clamp-2">{notice.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notice.publishedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                  {urgentNotices.length === 0 && (
                    <p className="text-center text-muted-foreground py-4 text-sm">No urgent notices</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Academic</span>
                  <span className="font-mono font-semibold">{allNotices.filter(n => n.category === 'academic').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Examination</span>
                  <span className="font-mono font-semibold">{allNotices.filter(n => n.category === 'examination').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Events</span>
                  <span className="font-mono font-semibold">{allNotices.filter(n => n.category === 'events').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fee</span>
                  <span className="font-mono font-semibold">{allNotices.filter(n => n.category === 'fee').length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-xl border-2 border-border w-full max-w-lg shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display text-lg font-semibold">Create New Notice</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleCreateNotice} className="p-4 space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  className="mt-1.5"
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  placeholder="Notice title"
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <textarea
                  id="content"
                  className="mt-1.5 flex w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                  value={newNotice.content}
                  onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                  placeholder="Notice content..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <select
                    id="category"
                    className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3"
                    value={newNotice.category}
                    onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ })}
                  >
                    <option value="general">General</option>
                    <option value="academic">Academic</option>
                    <option value="examination">Examination</option>
                    <option value="events">Events</option>
                    <option value="fee">Fee & Dues</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="targetRole">Target Audience</Label>
                  <select
                    id="targetRole"
                    className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3"
                    value={newNotice.targetRole}
                    onChange={(e) => setNewNotice({ ...newNotice, targetRole: e.target.value as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ })}
                  >
                    <option value="all">All</option>
                    <option value="student">Students</option>
                    <option value="faculty">Faculty</option>
                    <option value="hod">HODs</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="urgent"
                  className="w-4 h-4 rounded border-input"
                  checked={newNotice.isUrgent}
                  onChange={(e) => setNewNotice({ ...newNotice, isUrgent: e.target.checked })}
                />
                <Label htmlFor="urgent" className="font-normal">Mark as urgent</Label>
              </div>
            </form>
            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreateNotice} disabled={noticeMutations.create.isPending}>
                {noticeMutations.create.isPending ? 'Publishing...' : 'Publish Notice'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-xl border-2 border-border w-full max-w-lg shadow-xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display text-lg font-semibold">Edit Notice</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowEditModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleEditNotice} className="p-4 space-y-4">
              <div>
                <Label htmlFor="title-edit">Title</Label>
                <Input
                  id="title-edit"
                  className="mt-1.5"
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  placeholder="Notice title"
                />
              </div>
              <div>
                <Label htmlFor="content-edit">Content</Label>
                <textarea
                  id="content-edit"
                  className="mt-1.5 flex w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                  value={newNotice.content}
                  onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                  placeholder="Notice content..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <select
                    className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3"
                    value={newNotice.category}
                    onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ })}
                  >
                    <option value="general">General</option>
                    <option value="academic">Academic</option>
                    <option value="examination">Examination</option>
                    <option value="events">Events</option>
                    <option value="fee">Fee & Dues</option>
                  </select>
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <select
                    className="mt-1.5 h-10 w-full rounded-lg border-2 border-input bg-background px-3"
                    value={newNotice.targetRole}
                    onChange={(e) => setNewNotice({ ...newNotice, targetRole: e.target.value as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ })}
                  >
                    <option value="all">All</option>
                    <option value="student">Students</option>
                    <option value="faculty">Faculty</option>
                    <option value="hod">HODs</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="urgent-edit"
                  className="w-4 h-4 rounded border-input"
                  checked={newNotice.isUrgent}
                  onChange={(e) => setNewNotice({ ...newNotice, isUrgent: e.target.checked })}
                />
                <Label htmlFor="urgent-edit" className="font-normal">Mark as urgent</Label>
              </div>
            </form>
            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={handleEditNotice} disabled={noticeMutations.update.isPending}>
                {noticeMutations.update.isPending ? 'Updating...' : 'Save Changes'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
