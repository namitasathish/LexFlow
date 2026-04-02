# LexFlow — Legal Workflow & Deadline Management System

A dual-portal Legal CRM and workflow system designed for lawyers and clients.
LexFlow enables structured case management, secure communication, document handling, and automated deadline tracking with an offline-first approach.

## Overview

LexFlow provides two role-based interfaces:

* **Lawyer Portal** — case management, client tracking, and workflow automation
* **Client Portal** — case visibility, communication, and document sharing

The system is built on a relational database ensuring consistency, data isolation, and reliability without constant internet access.

## Key Features

### Lawyer Portal

* Case creation and milestone tracking
* Automated deadline classification (urgent and weekly)
* Scheduled notifications for hearings
* Client relationship management
* Case-based messaging system
* Document request and tracking
* Payment and invoice management
* Appointment scheduling

### Client Portal

* View case status and timelines
* Upload documents securely
* Request appointments
* Track payments and dues
* Provide feedback after case completion


## System Architecture

The application uses a relational SQLite database where all entities are connected.

**Core principle:** Cases act as the central entity linking:

* Clients
* Tasks
* Documents
* Messages
* Payments

**Data isolation:**

```sql
SELECT * FROM cases WHERE client_id = ?
```

Each user can only access their own data through role-based queries.



## Technology Stack

* Frontend: React Native (Expo)
* Navigation: React Navigation
* Database: SQLite (offline-first)
* Backend (optional): Node.js + Express (chat relay)
* Storage: Async Storage
* Notifications: Expo Notifications

## Setup

```bash
cd Legalworkflow
npm install
```

### Run backend (optional)

```bash
cd backend
node server.js
```

### Start app

```bash
npx expo start
```

## Testing

Run all tests:

```bash
npm test
```

Covers database operations, authentication, notifications, messaging, and workflows.


## Security

* Role-based access control
* Client-specific data isolation
* Safe state reset on navigation
* Data isolation


