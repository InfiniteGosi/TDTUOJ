# Use-Case Diagram — Missing Items (vs. original `usecase.png`)

Comparison of the original hand-drawn diagram against the implemented TDTUOJ codebase.
These were absent in the original and have been added to `usecase.drawio`.

---

## 🔴 Major gaps (whole subsystems)

### 1. Lab / Assignment module — completely absent
The original showed organizations but none of the lab subsystem
(`lab/` module: `LabFormPage`, `LabDetailPage`, `LabProgressPage`, `LabProblemPage`).

Added use cases:
- **Contest creator:** Create lab, Update lab, Delete lab, View lab progress (track students)
- **User:** View lab, Submit lab exercise

### 2. Submission viewing — absent
Original had *Submit solution* + *Evaluate submission* but no read side.

Added use cases:
- **User:** View submission history, View submission detail
  (verdict, source code, time/memory)

---

## 🟠 Notable gaps

### 3. Contest registration workflow
*Participate in contests* was too coarse; the real flow has an approval step.

Added use cases:
- **User:** Register for contest
- **Contest creator:** Approve contest registration

### 4. AI test-case generation
Original AI parser only had *Upload problem from PDF*. The Gemini-based
test-case generator was missing.

Added use case:
- **Contest creator → AI parser service:** Generate test cases

### 5. Manage test cases
Authoring test cases (sample vs. hidden) is a distinct action, not just part
of *Create problem*.

Added use case:
- **Contest creator:** Manage test cases

### 6. Global user ranking + profiles
Original only had *View leaderboard in contests*. The global user leaderboard
(`UserPage`) and public profile (rating history, activity heatmap, language
stats) were missing.

Added use cases:
- **User:** View users leaderboard, View user profile

### 7. Own-account management
Authenticated self-service actions were absent.

Added use cases:
- **User:** Edit profile, Change password, Upload avatar

---

## 🟡 Minor / structural

### 8. Admin had no generalization to Contest creator
In the system, Admin can do everything a Creator can (manage problems,
contests, organizations) plus user management. The original linked Admin only
to *Disable user* and *Update user information*.

Added relationships:
- **Generalization:** Contest creator ▷ User
- **Generalization:** Admin ▷ Contest creator

### 9. Admin tag management
`AdminProblemTagPage` lets Admin manage tags standalone (create/edit/delete) —
distinct from the *Add problem tag* `<<include>>` of *Create problem*.

Added use case:
- **Admin:** Manage problem tags

### 10. Organization membership detail
Original had *Join organization* only. The membership flow is richer.

Added (folded into org management): Add users to organization, Promote /
De-promote user in organization.
*(Optional further detail not yet drawn: Invite member, Accept/Reject
invitation, Leave organization, Remove member.)*

### 11. Reply to comment
Comments are threaded (replies-on-replies); a nested reply is distinct from a
top-level comment.

Added use case:
- **User:** Reply to comment (`<<extend>>` of Add comment on problem)

---

## Summary table

| # | Missing item | Actor | Severity |
|---|--------------|-------|----------|
| 1 | Lab module (create/update/delete/progress, view/submit) | Creator, User | 🔴 |
| 2 | View submission history / detail | User | 🔴 |
| 3 | Register for contest / Approve registration | User, Creator | 🟠 |
| 4 | Generate test cases (AI) | Creator | 🟠 |
| 5 | Manage test cases | Creator | 🟠 |
| 6 | View users leaderboard / user profile | User | 🟠 |
| 7 | Edit profile / Change password / Upload avatar | User | 🟠 |
| 8 | Admin ▷ Creator ▷ User generalization | Admin, Creator | 🟡 |
| 9 | Manage problem tags | Admin | 🟡 |
| 10 | Organization membership detail | Creator | 🟡 |
| 11 | Reply to comment | User | 🟡 |

---

## Still NOT drawn (optional, decide if needed)
- Logout
- Google OAuth login (currently folded into Login/Register)
- Invite member / Accept invitation / Leave organization / Remove member
  (org membership sub-flows)
- Notification / toast events (not domain use cases)
