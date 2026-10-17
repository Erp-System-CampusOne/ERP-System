import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'CampusOne';
const ORIGIN = 'https://campusone.edu';

const pageNames: Record<string, string> = {
  '/login': 'Sign in', '/forgot-password': 'Forgot password',
  '/reset-password': 'Reset password', '/verify-email': 'Verify email', '/not-found': 'Page not found',
  '/hod': 'HOD Command Center',
  '/student': 'Student dashboard', '/student/courses': 'Student courses', '/student/attendance': 'Student attendance',
  '/student/timetable': 'Student timetable', '/student/exams': 'Student examinations', '/student/fees': 'Student fees',
  '/student/library': 'Student library', '/student/documents': 'Student documents', '/faculty': 'Faculty dashboard',
  '/faculty/attendance': 'Faculty attendance', '/faculty/classes': 'Faculty classes', '/faculty/grading': 'Grade entry',
  '/faculty/leaves': 'Leave management', '/faculty/timetable': 'Faculty timetable', '/faculty/department': 'Department management',
  '/admin': 'Administration dashboard', '/admin/students': 'Student directory',
  '/admin/faculty': 'Faculty directory', '/admin/hod': 'HOD Management', '/admin/academics': 'Academics management', '/admin/timetable-builder': 'Timetable builder',
  '/admin/examinations': 'Examinations', '/admin/notices': 'Campus notices', '/admin/roles': 'Access roles',
  '/finance': 'Finance dashboard', '/finance/structures': 'Fee structures', '/finance/dues': 'Fee dues',
  '/finance/transactions': 'Payment ledger', '/finance/reports': 'Financial analytics', '/library': 'Library dashboard',
  '/library/catalog': 'Book catalog', '/library/circulation': 'Circulation desk', '/library/fines': 'Fine management',
  '/analytics': 'Analytics overview', '/analytics/academic-performance': 'Academic performance',
  '/analytics/placement': 'Placement analytics', '/analytics/financial-health': 'Financial health',
};

export function SeoManager() {
  const { pathname } = useLocation();
  const name = pageNames[pathname] ?? 'Campus management platform';
  const title = `${name} | ${SITE}`;
  const description = `${name} in CampusOne, a secure campus management platform for students, faculty, administrators and campus teams.`;
  const canonical = `${ORIGIN}${pathname === '/' ? '' : pathname}`;

  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let node = document.head.querySelector<HTMLMetaElement>(selector);
      if (!node) {
        node = document.createElement('meta');
        if (property) node.setAttribute('property', name);
        else node.setAttribute('name', name);
        document.head.appendChild(node);
      }
      node.content = content;
    };
    setMeta('description', description); setMeta('og:title', title, true); setMeta('og:description', description, true);
    setMeta('og:url', canonical, true); setMeta('og:image', `${ORIGIN}/social-share.svg`, true);
    setMeta('twitter:card', 'summary_large_image'); setMeta('twitter:title', title); setMeta('twitter:description', description); setMeta('twitter:image', `${ORIGIN}/social-share.svg`);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical;
  }, [canonical, description, title]);

  useEffect(() => {
    const id = 'campusone-structured-data';
    document.getElementById(id)?.remove();
    const script = document.createElement('script'); script.id = id; script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollegeOrUniversity', '@id': `${ORIGIN}#organization`, name: SITE, url: ORIGIN, description, logo: `${ORIGIN}/favicon.svg` },
      { '@type': 'LocalBusiness', '@id': `${ORIGIN}#business`, name: SITE, url: ORIGIN, description, image: `${ORIGIN}/social-share.svg`, email: 'support@campusone.edu', address: { '@type': 'PostalAddress', addressCountry: 'IN' }, parentOrganization: { '@id': `${ORIGIN}#organization` } },
    ] });
    document.head.appendChild(script); return () => script.remove();
  }, [description]);
  return null;
}
