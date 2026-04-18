# Import/export entire database

Prompt - remove me:

```
Help me write a comprehensive specification for this feature.
 
Before asking any questions:
  - Read the summary and requirements carefully
  - Research the existing codebase for related patterns, components, data models, and any prior art relevant to this feature
  - Identify gaps, ambiguities, edge cases, constraints, and risks that need resolution
 
Then ask targeted clarifying questions, grouped by theme (e.g. UX/behaviour, permissions, data, integrations, edge cases). For each question, briefly explain why it matters to the spec. Prioritise the most impactful unknowns first, and don't ask questions you can answer from research.
 
After I answer, produce the specification including:
  - Summary – rewritten if needed for clarity
  - Detailed description – behaviour, flows, states, constraints
  - Key decisions – recorded with rationale
  - User stories – one or more, concise
  - Diagrams – sequence/flow/state where helpful (Mermaid)
  - Manual test steps – for QA
  - Implementation tasks – ordered, with any dependency notes
```

## Summary

To support easy backups of data and be able to migrate between instances of Sid, I want to be able to export a backup of the entire database as a zipped JSON file, including attachments (as a BASE64 encoded string). I then want to be able to import that zip file into a different Sid instance.

It should create accounts from the imported backup, and if there's an account name conflict it should name the imported account `<account name> <yyyymmddhhss>`.

## Detailed description

AI: Allow the AI to fill this in, to check and refine it's understanding of the feature.

## User stories

AI: Use *as a, I want to, so that* syntax

## Key decisions

AI: Document the key decisions made from the clarifying questions you asked

| Decision | Outcome |
|----------|---------|
|          |         |

## Requirements

- Export data - download a zipped JSON file containing the entire database (including any attachments and soft-deleted data)
- Import data - upload and import a zipped JSON file
- Rename conflicting account names by appending the current timestamp

## Permissions matrix

AI: Only if appropriate

## Validation

AI: Optional

| Rule | Error message |
| ---- | ------------- |
|      |               |

## Diagrams

AI: Optional. Use Mermaid syntax.

## Acceptance criteria

AI: Comprehensive acceptance criteria written using Gherkin syntax

## Manual test steps

AI: Comprehensive manual testing steps, that any experienced but non-technical user of the system would be able to complete

## Implementation tasks

AI: A list of tasks required to implement the feature. Include dependencies between tasks, and order by dependency. Each task should reference the exact files and patterns to follow.


