# Brain.md — SeqBook Project Rules

These are the permanent rules for working on this project.

Read this file before making changes and follow it for every task.

---

## 1. Understand the Project Before Changing It

This project is a small student ticket-booking system built around:

* React
* TypeScript
* Vite
* Tailwind CSS
* Supabase
* PostgreSQL
* SQL / PL/pgSQL

The project already has an organized structure.

Respect the existing structure:

* `src/features` → feature-specific code
* `src/components` → reusable UI components
* `src/pages` → page-level UI
* `src/services` → database and application services
* `src/types` → shared types
* `supabase/migrations` → database schema, RLS, functions, and booking logic

Do not replace the existing architecture with a new one just because another pattern is more popular.

---

## 2. Keep Everything Simple

This is a student project.

Do not treat it like a massive production platform.

Use the simplest solution that correctly solves the current problem.

Do not add complexity unless the current problem actually requires it.

Avoid unnecessary:

* abstractions
* design patterns
* layers
* wrappers
* managers
* factories
* interfaces
* generic utility systems
* event systems
* queues outside the project's existing queue
* extra libraries
* extra dependencies

Do not build infrastructure for hypothetical future problems.

Solve today's problem.

---

## 3. Do Not Overengineer

This rule is strict.

A 10-line problem should not become a 200-line solution.

Do not turn a simple bug into:

* a refactor of the whole application
* a new architecture
* a new state-management system
* a new service layer
* a new database abstraction
* a new concurrency framework

Before adding something, ask:

"Is this actually necessary to solve the user's problem?"

If not, do not add it.

---

## 4. Find the Real Cause First

When something is broken:

1. Inspect the existing code.
2. Trace the actual flow.
3. Find where the behavior becomes wrong.
4. Identify the exact cause.
5. Fix that cause.
6. Test the result.

Do not immediately start rewriting code.

Do not guess.

Do not make several unrelated changes and hope one fixes the issue.

---

## 5. Do Not Hallucinate

Never invent project details.

Do not assume a function exists.

Do not assume a table exists.

Do not assume a file exists.

Do not assume a database rule exists.

Do not assume a framework behaves a certain way.

Check the actual project first.

Use the repository's real files, functions, queries, tables, types, and existing code.

When something is uncertain, investigate it before making a conclusion.

---

## 6. No Comments in Code

Do not add comments to source code.

Do not add:

```ts
// this checks if the seat is available
```

Do not add comments explaining obvious logic.

Do not add comments explaining every function.

Do not leave TODO comments.

The code should be understandable from its structure and naming.

Use clear names instead of comments.

---

## 7. Keep Files Small and Organized

Do not create giant files.

Do not put unrelated logic into one file.

Do not allow a component or service to grow into a huge collection of unrelated responsibilities.

At the same time, do not create a separate file for every tiny function.

Use normal judgment.

Keep related code together.

Separate code when it has a clearly different responsibility.

The existing project already separates features, pages, components, services, and types. Keep using that structure.

---

## 8. Preserve Existing Patterns

Before creating new code, inspect similar code that already exists.

Copy the project's existing style where appropriate.

For example:

* If a service already handles Supabase calls in a certain way, follow that pattern.
* If pages are structured a certain way, follow that pattern.
* If features have their own components, keep feature code there.
* If types already exist, reuse them.

Do not create a completely different pattern for one new feature.

Consistency is more important than theoretical elegance.

---

## 9. Sequential Processing Is the Core Idea

The project's main technical purpose is demonstrating sequential booking processing and preventing seat conflicts.

Do not accidentally destroy that behavior.

The booking flow must remain understandable:

Customer request
→ booking queue
→ sequential processing
→ seat validation
→ booking/payment operation
→ result/logging

The important rule is:

**One booking request is processed at a time.**

Do not introduce parallel processing into the sequential processor.

Do not replace a sequential `await` flow with `Promise.all()`.

Do not add background concurrency unless the user explicitly asks for it and the change is actually required.

---

## 10. Treat the Database as Part of the Core Logic

The Supabase SQL is not just setup code.

The database contains important booking and concurrency rules.

The migration files include:

* schema
* RLS
* database functions
* booking processing logic

The files under:

`supabase/migrations/`

must be treated as part of the application's core behavior.

Do not move important booking rules into the frontend simply because it is easier.

Do not remove database protections without understanding why they exist.

---

## 11. Race Conditions: Keep the Solution Direct

The project is specifically concerned with race conditions during seat booking.

When investigating a race condition, first check:

* order of execution
* duplicate requests
* multiple processor calls
* missing state checks
* incorrect `await`
* stale data
* database locking
* transaction boundaries
* duplicate booking attempts

Do not immediately invent complicated distributed-system explanations.

This project is not a distributed cloud platform.

Trace the actual request from frontend to Supabase and find the exact point where two operations can overlap.

Then fix that point.

---

## 12. Do Not Add Concurrency to "Improve Performance"

Do not parallelize the booking processor just because parallel code appears faster.

The sequential behavior exists for a reason.

Correctness comes first.

A slower but correct sequential booking operation is preferable to a faster implementation that can produce inconsistent booking results.

---

## 13. Frontend Responsibilities

The frontend should mainly handle:

* user interaction
* pages
* forms
* displaying data
* seat selection UI
* booking requests
* queue/status display
* admin interfaces

Do not put large amounts of database logic directly inside UI components.

Keep reusable data operations inside the existing service structure when appropriate.

The project already has dedicated services such as booking, schedule, seat, and Supabase access. Reuse them instead of duplicating database calls across components.

---

## 14. Database Responsibilities

Supabase/PostgreSQL should handle important data rules.

Especially:

* booking integrity
* seat availability
* transaction-sensitive operations
* queue processing
* database-level protection
* RLS
* important validation

Do not duplicate complicated database rules unnecessarily in several frontend locations.

Frontend checks are useful for user experience.

Database checks are required for data integrity.

---

## 15. Do Not Duplicate Logic

Before writing a new function, search the project.

There may already be code that does what is needed.

Do not create:

`getAvailableSeats()`

when an existing function already handles the same job.

Do not copy the same Supabase query into five components.

Do not create duplicate booking logic.

Reuse existing code when it is correct.

---

## 16. Make the Smallest Correct Change

Prefer:

```text
one bug → one cause → one focused fix
```

Not:

```text
one bug → rewrite several files → redesign architecture
```

Only modify unrelated code when there is a direct reason it must change.

Do not refactor working code during a small bug fix unless the refactor is necessary for the fix.

---

## 17. Do Not Change Behavior Without a Reason

Avoid unnecessary changes to:

* UI
* database schema
* route structure
* authentication
* booking behavior
* queue behavior
* existing services
* existing data models

A requested bug fix should not unexpectedly change another part of the application.

---

## 18. Verify Your Work

After changing code:

* run the relevant checks
* inspect TypeScript errors
* run the application when possible
* test the affected flow
* verify database behavior when relevant

Do not say "fixed" just because the code looks correct.

Confirm it when possible.

If something could not be tested, say so clearly.

---

## 19. When Debugging, Show Evidence

Do not explain a bug using theory alone.

Prefer evidence such as:

```text
Request A enters here.
Request B enters here.
Both reach this function.
This value is still available.
Then both attempt this operation.
```

Build the explanation from the actual execution flow.

---

## 20. Do Not Keep Trying Random Fixes

When the first fix fails:

Stop.

Do not immediately add another workaround.

Go back to the evidence.

Find out why the first fix did not solve the problem.

Then make a better targeted change.

Repeated guessing creates more bugs.

---

## 21. Do Not Introduce Unnecessary Dependencies

Before installing anything, check whether the project can solve the problem using what it already has.

Do not install a package for a tiny task that can be solved with existing code.

Every new dependency adds maintenance cost.

---

## 22. Do Not Rewrite Working Code Just Because You Prefer Another Style

The goal is to improve the project, not rewrite it into your personal style.

Do not replace working code merely because:

* another library is newer
* another architecture is more popular
* another coding style looks cleaner
* another implementation is theoretically better

Change it when there is a real reason.

---

## 23. Keep TypeScript Simple

Use the existing TypeScript types.

Avoid unnecessary generic types and complicated type tricks.

Do not use `any` as an easy escape from a type problem.

Do not create a complicated type system for simple data.

Use clear interfaces and types where they actually help.

---

## 24. Keep React Simple

Prefer clear React components.

Do not create unnecessary custom hooks, context providers, wrappers, or state-management systems.

Before adding a hook or abstraction, check whether normal component state and the existing service layer already solve the problem.

---

## 25. Keep SQL Understandable

SQL and PL/pgSQL should be written so that a student developer can follow it.

Do not create unnecessarily clever SQL.

Do not hide simple database operations behind layers of abstraction.

Keep transaction and locking behavior explicit.

The important booking logic should remain understandable when someone reads the migration files directly.

---

## 26. Do Not Optimize Prematurely

Do not optimize something unless there is an actual problem.

First make it:

1. correct
2. simple
3. readable

Then optimize only when needed.

---

## 27. Communication Rules

Use simple English.

Keep explanations direct.

Do not use unnecessarily complicated words.

Avoid words that make a simple technical explanation sound academic or overly formal.

Prefer:

"Both requests reached this code at the same time."

instead of:

"The concurrent execution contexts produced a synchronization anomaly."

Explain things like a developer talking to another developer.

---

## 28. Keep Responses Focused

When reporting work:

State:

1. what was wrong
2. what was changed
3. why it fixes the problem
4. how it was verified

Do not write a huge explanation when a few clear paragraphs are enough.

---

## 29. Ask Before Large Changes

If a task would require:

* changing the database design
* replacing the current architecture
* adding major dependencies
* rewriting a large section
* changing the sequential processing model

do not silently do it.

Explain the impact first and ask for confirmation when the change is genuinely large.

Small bug fixes do not require confirmation.

---

## 30. The Main Rule

Always prefer:

**simple + correct + organized**

over:

**complex + clever + overengineered**

Do not solve problems that do not exist.

Do not invent complexity.

Find the real problem.

Fix the real problem.

Test it.

Stop.
