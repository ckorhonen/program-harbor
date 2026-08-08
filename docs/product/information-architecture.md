# Information architecture

The app has one event-scoped admin shell and three focused public/role surfaces.

```text
Program Harbor
├── Demo launchpad
│   ├── Admin demo
│   ├── Evaluator demo
│   └── Speaker demo
├── Admin
│   ├── Dashboard / onboarding
│   ├── Submissions
│   ├── Forms
│   ├── Evaluations
│   ├── Schedule
│   ├── Communications
│   ├── Speakers and tasks
│   ├── Resources
│   ├── Integrations
│   └── Event settings
├── Evaluator
│   └── Assigned review queue
├── Speaker portal
│   ├── Overview
│   ├── Profile and files
│   ├── Tasks and forms
│   └── Resources
└── Public
    ├── CFP
    ├── Speaker gallery
    ├── Schedule
    └── API docs
```

The dashboard is the default admin landing page because it answers the highest-value operational question first. Forms, submissions, and schedule remain one click away in a persistent shell; public and speaker surfaces never inherit admin navigation.
