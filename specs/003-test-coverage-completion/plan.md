# Implementation Plan: Complete Integration Test Coverage

## Overview

**Objective**: Achieve 100% integration test coverage for all API endpoints in alignment with the project constitution requirement: "Backend Integration Tests: 100% of API endpoints"

**Current State**:
- ✅ Workstreams: 8/8 endpoints tested (100%)
- ⚠️ Auth: 2/5 endpoints tested (40%)
- ❌ Tags: 0/5 endpoints tested (0%)
- ❌ Status Updates: 0/4 endpoints tested (0%)
- ❌ Timeline: 0/1 endpoint tested (0%)
- ❌ Health: 0/1 endpoint tested (0%)
- **Overall: 10/24 endpoints (~42% coverage)**

**Target State**: 24/24 endpoints tested (100% coverage)

## Constitution Check

*GATE: Must pass before implementation*

✅ **TDD Mandatory**: All tests will be written FIRST, verified to fail, then implementation verified
✅ **100% Endpoint Coverage**: This plan addresses the constitutional requirement
✅ **Test Structure**: Tests will mirror source structure (tests/integration/)
✅ **Simplicity First**: Using existing test patterns from workstreams.test.ts
✅ **Data Integrity**: All tests include data isolation verification

**Performance Gates**: N/A (no performance-impacting changes)
**Security Gates**: All tests verify user isolation and authentication

## Problem Statement

The project constitution mandates 100% integration test coverage for all API endpoints, but currently only 42% of endpoints have integration tests. This creates risk:

1. **Regression Risk**: Untested endpoints (tags, status updates, timeline) could break without detection
2. **Constitution Violation**: Current state violates "Backend Integration Tests: 100% of API endpoints"
3. **Data Integrity Risk**: Critical flows like status update creation/deletion lack E2E verification
4. **Refactoring Confidence**: Cannot safely refactor service layer without full endpoint coverage

**Why Now**: The backlog system and tag management features are in active use. Missing test coverage for these critical features is unacceptable per constitution.

## Proposed Solution

### Approach

Follow the **existing test pattern** established in `workstreams.test.ts`:
- Use `testDb` helpers for data setup
- Use `testApp` helper for authenticated requests
- Test structure: happy path → validation → error cases → data isolation
- Each test file covers all endpoints for its route

### Scope

**In Scope**:
1. Create `backend/tests/integration/tags.test.ts` (5 endpoints)
2. Create `backend/tests/integration/statusUpdates.test.ts` (4 endpoints)
3. Create `backend/tests/integration/timeline.test.ts` (1 endpoint)
4. Create `backend/tests/integration/health.test.ts` (1 endpoint)
5. Enhance `backend/tests/integration/auth.test.ts` (3 missing test cases)

**Out of Scope**:
- Frontend component tests (separate effort)
- Unit test improvements (already at good coverage)
- E2E browser tests (already exists in spec 001)
- Performance testing (not required by constitution)

### Test Coverage Matrix

| Route File | Endpoint | Method | Status | Test File |
|------------|----------|--------|--------|-----------|
| auth.ts | /auth/google | GET | ⚠️ Partial | auth.test.ts |
| auth.ts | /auth/google/callback | GET | ⚠️ Partial | oauth-flow.test.ts |
| auth.ts | /auth/user | GET | ✅ Complete | auth.test.ts |
| auth.ts | /auth/logout | POST | ⚠️ Partial | auth.test.ts |
| auth.ts | /auth/debug | GET | ❌ Missing | auth.test.ts |
| health.ts | /health | GET | ❌ Missing | health.test.ts (NEW) |
| workstreams.ts | /workstreams | GET | ✅ Complete | workstreams.test.ts |
| workstreams.ts | /workstreams/:id | GET | ✅ Complete | workstreams.test.ts |
| workstreams.ts | /workstreams | POST | ✅ Complete | workstreams.test.ts |
| workstreams.ts | /workstreams/:id | PUT | ✅ Complete | workstreams.test.ts |
| workstreams.ts | /workstreams/:id/close | PUT | ✅ Complete | workstreams.test.ts |
| workstreams.ts | /workstreams/:id/reopen | PUT | ✅ Complete | workstreams.test.ts |
| workstreams.ts | /workstreams/:id | DELETE | ✅ Complete | workstreams.test.ts |
| workstreams.ts | /workstreams/:id/status-updates | GET | ✅ Complete | workstreams.test.ts |
| tags.ts | /tags | GET | ❌ Missing | tags.test.ts (NEW) |
| tags.ts | /tags | POST | ❌ Missing | tags.test.ts (NEW) |
| tags.ts | /tags/reorder | PUT | ❌ Missing | tags.test.ts (NEW) |
| tags.ts | /tags/:id | PUT | ❌ Missing | tags.test.ts (NEW) |
| tags.ts | /tags/:id | DELETE | ❌ Missing | tags.test.ts (NEW) |
| statusUpdates.ts | /status-updates | POST | ❌ Missing | statusUpdates.test.ts (NEW) |
| statusUpdates.ts | /status-updates/workstreams/:workstreamId/status-updates | GET | ❌ Missing | statusUpdates.test.ts (NEW) |
| statusUpdates.ts | /status-updates/:id | PUT | ❌ Missing | statusUpdates.test.ts (NEW) |
| statusUpdates.ts | /status-updates/:id | DELETE | ❌ Missing | statusUpdates.test.ts (NEW) |
| timeline.ts | /timeline | GET | ❌ Missing | timeline.test.ts (NEW) |

## Implementation Strategy

### Phase 1: Tags Integration Tests (Priority: P1)
**Duration**: 2 hours

Create comprehensive integration tests for tag management:

**Endpoints to Test**:
1. GET /tags - List all tags for user's project
2. POST /tags - Create new tag
3. PUT /tags/reorder - Reorder tags (drag-drop feature)
4. PUT /tags/:id - Update tag (name, color, emoji)
5. DELETE /tags/:id - Delete tag

**Test Scenarios** (following workstreams.test.ts pattern):
- Happy path for each endpoint
- Validation errors (missing fields, invalid data)
- Field length limits (name, emoji)
- Color format validation (#RRGGBB)
- Reorder with invalid tag IDs
- Data isolation (cannot access other user's tags)
- Cascading behavior (what happens to workstreams when tag deleted)

**TDD Workflow**:
1. Write test for GET /tags (empty array)
2. Run test → verify it passes (endpoint exists)
3. Write test for GET /tags (with data)
4. Run test → verify it passes
5. Repeat for POST, PUT, DELETE following same pattern

### Phase 2: Status Updates Integration Tests (Priority: P1)
**Duration**: 2 hours

Create comprehensive integration tests for status update CRUD:

**Endpoints to Test**:
1. POST /status-updates - Create status update for workstream
2. GET /status-updates/workstreams/:workstreamId/status-updates - Get all status updates for workstream
3. PUT /status-updates/:id - Update existing status update
4. DELETE /status-updates/:id - Delete status update

**Test Scenarios**:
- Create status update with required fields only
- Create with optional note field
- Validation: missing workstreamId, missing status, empty status
- Field length limits (status 500 chars, note 2000 chars)
- Get status updates for workstream (ordered by createdAt DESC)
- Update status and note
- Delete status update
- Data isolation (cannot access other user's status updates)
- Cannot create status update for non-existent workstream
- Cannot create status update for other user's workstream

**TDD Workflow**: Same as Phase 1

### Phase 3: Timeline Integration Tests (Priority: P2)
**Duration**: 1 hour

Create integration tests for timeline view:

**Endpoint to Test**:
1. GET /timeline - Get timeline with filters

**Test Scenarios**:
- Get all status updates (no filters)
- Filter by startDate
- Filter by endDate
- Filter by date range (startDate + endDate)
- Filter by tagIds (single tag)
- Filter by tagIds (multiple tags comma-separated)
- Combine date and tag filters
- Invalid date format handling
- Empty result when no data matches
- Data isolation (only returns user's data)
- Verify ordering (DESC by createdAt)
- Verify workstream and tag data included in response

**TDD Workflow**: Same as Phase 1

### Phase 4: Health Check Integration Test (Priority: P3)
**Duration**: 15 minutes

Create simple integration test for health endpoint:

**Endpoint to Test**:
1. GET /health - Health check

**Test Scenarios**:
- Returns 200 status
- Returns expected JSON structure
- Database connection verified in response

### Phase 5: Auth Test Enhancements (Priority: P3)
**Duration**: 30 minutes

Add missing test coverage to existing auth tests:

**Missing Tests**:
1. GET /auth/debug - Test debug endpoint returns session info
2. POST /auth/logout - Improve test with actual session verification
3. OAuth callback edge cases already covered in oauth-flow.test.ts

## Testing Strategy

### TDD Workflow (Constitutional Requirement)

**For each endpoint**:
1. Write test that exercises the endpoint
2. Run test → verify it fails (if endpoint not implemented) OR passes (if endpoint exists)
3. If endpoint exists, write additional edge case tests
4. Run tests → verify all pass
5. Move to next endpoint

**Since all endpoints are already implemented**, tests will primarily verify:
- Correct HTTP status codes
- Correct response body structure
- Validation error handling
- Data isolation between users
- Edge cases and error scenarios

### Test Structure Pattern

```typescript
describe('[Route] API Integration Tests', () => {
  let person: any;
  let project: any;
  let app: any;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    person = await createTestPerson({ email: 'test@example.com', name: 'Test User' });
    project = await createTestProject(person.id, { name: 'Test Project' });
    app = createTestApp(routeModule, person);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('GET /endpoint', () => {
    it('should return empty array when no data exists', async () => {
      // Test empty state
    });

    it('should return all items for user project', async () => {
      // Test with data
    });

    // More test cases...
  });

  describe('POST /endpoint', () => {
    it('should create new item with valid data', async () => {
      // Test creation
    });

    it('should return 400 when required field missing', async () => {
      // Test validation
    });

    // More test cases...
  });

  describe('Data Isolation', () => {
    it('should not access items from another user', async () => {
      // Test multi-tenancy
    });
  });
});
```

### Test Coverage Targets

**After implementation**:
- ✅ Backend Integration Tests: 24/24 endpoints (100%)
- ✅ All validation rules tested
- ✅ All error scenarios tested
- ✅ Data isolation verified for all endpoints
- ✅ Constitution compliance: 100%

## Risk Assessment

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tests may reveal bugs in existing endpoints | Medium | Fix bugs as discovered (this is a benefit, not a risk) |
| Test database state management complexity | Low | Use existing cleanDatabase() pattern |
| Mock authentication may not match production | Low | Use existing testApp pattern proven in workstreams tests |
| Timeline query complexity (multiple filters) | Medium | Test each filter independently, then combinations |

### Mitigation Strategies

1. **Follow Existing Patterns**: Use workstreams.test.ts as the template
2. **Incremental Testing**: Test one endpoint at a time
3. **Use Existing Helpers**: Leverage testDb and testApp utilities
4. **Verify Locally**: Run tests after each file completion

## Dependencies

### Internal Dependencies
- ✅ Test helpers (testDb.ts, testApp.ts) - already exist
- ✅ Test database setup - already configured
- ✅ Jest configuration - already configured
- ✅ All route handlers implemented - no code changes needed

### External Dependencies
- None (all dependencies already installed)

## Timeline

**Total Estimated Time**: 6 hours

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Tags Tests | 2 hours | tags.test.ts with 5 endpoints tested |
| Phase 2: Status Updates Tests | 2 hours | statusUpdates.test.ts with 4 endpoints tested |
| Phase 3: Timeline Tests | 1 hour | timeline.test.ts with 1 endpoint tested |
| Phase 4: Health Test | 15 min | health.test.ts with 1 endpoint tested |
| Phase 5: Auth Enhancements | 30 min | auth.test.ts enhanced |
| Verification | 15 min | All tests passing, 100% coverage verified |

**Target Completion**: Single session (6 hours)

## Success Criteria

**Must Have** (Constitutional Compliance):
- ✅ All 24 API endpoints have integration tests
- ✅ All tests pass in CI/CD pipeline
- ✅ Test structure mirrors source structure
- ✅ Data isolation verified for all authenticated endpoints
- ✅ All validation rules tested
- ✅ TDD workflow followed (tests written, verified, passing)

**Should Have** (Quality):
- ✅ Error scenarios covered (404, 400, 500)
- ✅ Edge cases tested (empty strings, max lengths, invalid IDs)
- ✅ Response structure validation

**Nice to Have** (Documentation):
- ✅ Test descriptions clearly document endpoint behavior
- ✅ Tests serve as API documentation

## Rollback Plan

No rollback needed - this is additive work (only adding tests). If tests fail:
1. Fix the test if it's incorrectly written
2. Fix the endpoint if a bug is discovered
3. No production impact (tests are dev-time only)

## Future Enhancements

**Out of scope for this plan** (defer to future):
- Frontend integration test coverage improvement
- Contract tests for API schema validation
- Load/performance testing for endpoints
- Mutation testing to verify test quality
- Test data factories for more complex scenarios

## Related Documents

- Constitution: `.specify/memory/constitution.md` (TDD requirement, 100% endpoint coverage)
- Development Guide: `docs/DEVELOPMENT.md` (testing strategy)
- Existing Test Examples: `backend/tests/integration/workstreams.test.ts` (pattern to follow)
- Test Helpers: `backend/tests/helpers/testDb.ts`, `backend/tests/helpers/testApp.ts`

## Notes

**Constitutional Alignment**:
- ✅ TDD: Tests written first (endpoints exist, so tests verify behavior)
- ✅ 100% Endpoint Coverage: Explicit goal of this plan
- ✅ Simplicity First: Reuse existing patterns, no new abstractions
- ✅ Data Integrity: All tests verify data relationships and isolation
- ✅ Test Structure: Mirrors route structure (tests/integration/)

**Implementation Notes**:
- All routes already implemented - tests are verification, not TDD in strict sense
- However, any bugs discovered will be fixed TDD-style (write failing test, fix, verify)
- Priority order based on feature criticality (tags and status updates are core features)
- Health check lowest priority (simple endpoint, low risk)
