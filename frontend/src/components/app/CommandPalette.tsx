/**
 * CommandPalette (⌘/Ctrl+K) — jump to any page the role can use, or search
 * the student directory. Purely client-side navigation; reads go through the
 * existing /students endpoint with the same params as the list page.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CornerDownLeft, Loader2, Search, UserRound } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { get } from '@/shared/api/client';
import type { StudentSearchPage } from '@/shared/api/types';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { Avatar } from '@/components/ui/Avatar';
import { PAGES } from './navigation';

interface PaletteItem {
  id: string;
  section: string;
  label: string;
  hint?: string;
  to: string;
  icon: React.ReactNode;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { has, hasAny } = useAuth();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<StudentSearchPage['items']>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const requestId = useRef(0);
  const debounced = useDebouncedValue(query.trim(), 220);
  const canSearchStudents = has('students:read');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setStudents([]);
    setActive(0);
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !canSearchStudents || debounced.length < 2) {
      setStudents([]);
      setSearching(false);
      return;
    }
    const id = requestId.current + 1;
    requestId.current = id;
    setSearching(true);
    void get<StudentSearchPage>('/students', { name: debounced, page_size: 6 })
      .then((page) => {
        if (requestId.current === id) setStudents(page.items);
      })
      .catch(() => {
        if (requestId.current === id) setStudents([]);
      })
      .finally(() => {
        if (requestId.current === id) setSearching(false);
      });
  }, [debounced, open, canSearchStudents]);

  const items = useMemo<PaletteItem[]>(() => {
    const needle = query.trim().toLowerCase();
    const pageItems: PaletteItem[] = PAGES.filter((page) => !page.anyOf || hasAny(...page.anyOf))
      .filter(
        (page) =>
          !needle ||
          page.label.toLowerCase().includes(needle) ||
          page.description.toLowerCase().includes(needle),
      )
      .map((page) => {
        const Icon = page.icon;
        return {
          id: `page-${page.to}`,
          section: 'Jump to',
          label: page.label,
          hint: page.description,
          to: page.to,
          icon: <Icon className="h-4 w-4" aria-hidden />,
        };
      });

    const studentItems: PaletteItem[] = students.map((student) => ({
      id: `student-${student.id}`,
      section: 'Students',
      label: student.full_name,
      hint: `${student.roll_number} · ${student.branch_code}${student.class_section ? ` · ${student.class_section}` : ''}`,
      to: `/students/${student.id}`,
      icon: <Avatar name={student.full_name} size="xs" />,
    }));

    return [...pageItems, ...studentItems];
  }, [query, has, hasAny, students]);

  useEffect(() => {
    setActive(0);
  }, [items.length, query]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const go = (item: PaletteItem) => {
    onClose();
    navigate(item.to);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (items.length === 0 ? 0 : (index + 1) % items.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (items.length === 0 ? 0 : (index - 1 + items.length) % items.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[active];
      if (item) go(item);
    }
  };

  const sections = items.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    acc[item.section] = acc[item.section] ? [...acc[item.section], item] : [item];
    return acc;
  }, {});
  let runningIndex = -1;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[8vh] sm:pt-[12vh]">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="animate-scale-in relative w-full max-w-xl overflow-hidden rounded-card border border-line bg-surface shadow-lift"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search students, pages…"
            aria-label="Search students and pages"
            aria-controls="command-results"
            aria-activedescendant={items[active] ? `cmd-${items[active].id}` : undefined}
            role="combobox"
            aria-expanded="true"
            className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          {searching ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" aria-hidden /> : null}
          <kbd className="hidden shrink-0 rounded border border-line-strong px-1.5 py-0.5 text-[10.5px] font-semibold text-muted sm:block">
            esc
          </kbd>
        </div>

        <div ref={listRef} id="command-results" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted">
              {query.trim().length >= 2 && searching
                ? 'Searching…'
                : `No matches for “${query.trim()}”. Try a student name, roll number or page.`}
            </p>
          ) : (
            Object.entries(sections).map(([section, sectionItems]) => (
              <div key={section} className="mb-1">
                <p className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted">
                  {section}
                </p>
                {sectionItems.map((item) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const selected = index === active;
                  return (
                    <button
                      key={item.id}
                      id={`cmd-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(item)}
                      className={`flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors ${
                        selected ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-surface-2'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                          selected ? 'bg-surface text-brand-600' : 'bg-surface-2 text-muted'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">{item.label}</span>
                        {item.hint ? (
                          <span className="block truncate text-[11.5px] text-muted">{item.hint}</span>
                        ) : null}
                      </span>
                      {selected ? (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-line-strong" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
          {!canSearchStudents && query.trim().length >= 2 ? (
            <p className="flex items-center gap-2 px-3 py-2 text-[11.5px] text-muted">
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              Student search isn&apos;t available for your role.
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-surface-2/60 px-4 py-2 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line-strong bg-surface px-1 py-0.5 font-sans text-[10px]">↑</kbd>
            <kbd className="rounded border border-line-strong bg-surface px-1 py-0.5 font-sans text-[10px]">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line-strong bg-surface px-1 py-0.5 font-sans text-[10px]">↵</kbd>
            to open
          </span>
          <span className="ml-auto hidden sm:block">Search across the college</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
