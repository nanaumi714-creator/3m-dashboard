# Non-Functional Requirements (NFR)

## Scale
- **Target Users**: Single tenant / Small team initially.
- **Data Volume**: Expect hundreds of transactions per month. Scalability to thousands should be considered but not over-engineered.

## Performance Goals
- **Page Load**: Dashboard should load < 1.5s (LCP).
- **Interaction**: UI inputs should response < 100ms (INP).
- **OCR Processing**: < 10 seconds per image (async accepted).

## Availability (SLA)
- **Target**: Best effort (Personal/Small Biz use). No strict 99.99% requirement, but data durability is critical.

## Browser Support
- **Target**: Modern Browsers (Chrome, Edge, Safari, Firefox) - Last 2 major versions.
- **Mobile**: Responsive web design required.

## Accessibility
- **Goal**: WCAG 2.1 AA where feasible (sufficient contrast, keyboard navigation).
