# Requirements Checklist — Metadata-Driven Full-Stack Application Builder

## Mandatory Requirements
- [ ] UI must be rendered from metadata/configuration (no hard-coded UI)
- [ ] Basic admin UI for creating and editing metadata
- [ ] Persist metadata/configuration
- [ ] Persist submitted user data
- [ ] Dynamic forms driven by metadata
- [ ] Dynamic dashboards driven by metadata
- [ ] At least one data table (submitted records)
- [ ] At least one KPI/stat widget
- [ ] At least one chart from submitted data
- [ ] Support validation and conditional field visibility
- [ ] GitHub repository with screenshots and clear local setup instructions

---

## Admin / Metadata Configuration Area
- [ ] Create metadata through the UI
- [ ] Edit metadata through the UI
- [ ] Support form definitions
- [ ] Support field definitions (label, field type, required flag)
- [ ] Support basic layout sections
- [ ] Allow advanced metadata to be seeded via JSON, DB seed data, or config files

## Runtime Application Area
- [ ] Read metadata and dynamically render forms
- [ ] Dynamically render validation from metadata
- [ ] Dynamically render conditional field visibility
- [ ] Dynamically render records/tables
- [ ] Dynamically render widgets and charts
- [ ] Dynamically render dashboards
- [ ] Support multiple form definitions
- [ ] Support multiple dashboard definitions
- [ ] No authentication required

## Functional Requirements
- [ ] Field type: text
- [ ] Field type: number
- [ ] Field type: date
- [ ] Field type: select / dropdown
- [ ] Field type: checkbox or toggle
- [ ] Validation — required fields enforced from metadata
- [ ] Conditional visibility — show/hide fields based on another field's value
- [ ] Display submitted data in a table view
- [ ] KPI/stat widget rendered from submitted data
- [ ] Chart rendered from submitted data
- [ ] At least one dashboard rendered from metadata
- [ ] Runs locally with clear setup instructions

---

## Deliverables
- [ ] GitHub repository
- [ ] README with local setup and run instructions
- [ ] README with architecture overview
- [ ] README with metadata/schema explanation
- [ ] README with assumptions and trade-offs
- [ ] Screenshot: admin/config UI
- [ ] Screenshot: rendered dynamic form
- [ ] Screenshot: submitted data table
- [ ] Screenshot: dashboard with KPI and chart widgets
- [ ] Lightweight tests — metadata-to-UI rendering
- [ ] Lightweight tests — validation logic
- [ ] Lightweight tests — one backend save/read flow

---

## Bonus Points (optional)
- [ ] Metadata versioning
- [ ] Computed fields
- [ ] Cross-field validation
- [ ] Plugin/widget registry architecture
- [ ] JSON import/export for metadata
- [ ] Dashboard layout editor or drag-and-drop builder
- [ ] Audit log
- [ ] Docker setup
- [ ] Deployed demo
- [ ] Storybook / component documentation
- [ ] Responsive design
- [ ] Clean architectural separation: metadata | renderer | persistence | UI components

---

## Technical Notes
- Technology stack is candidate's choice (frontend, backend, database, tooling)
- Third-party libraries and AI tools are allowed — disclose major tools used
- Do not wrap an off-the-shelf no-code or form-builder product
- Deployment is optional (counts as bonus)

### Suggested Metadata Concepts to Model
- Application definition
- Form definition
- Field definition
- Validation rule
- Layout / section definition
- Widget definition
- Dashboard definition
- Submitted record
- Metadata version *(bonus)*
