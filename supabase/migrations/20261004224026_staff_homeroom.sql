-- Staff can be credited with donations (owner, 2026-10-04). They are rows in
-- `students` in one homeroom, "Teachers", with no grade: that keeps them out
-- of Grade Wars while every other total, ranking and log works unchanged.
--
-- The staff rows themselves are inserted by hand, like the student roster;
-- real names stay out of this (public) repository.

alter table public.students alter column grade drop not null;

-- A missing grade means staff, and only staff: students still need 9–12.
alter table public.students
  add constraint staff_have_no_grade check ((grade is null) = (hr = 'Teachers'));
