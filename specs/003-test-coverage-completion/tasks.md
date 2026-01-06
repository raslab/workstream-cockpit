# Tasks: Complete Integration Test Coverage

## Metadata

**Feature**: Backend Integration Test Coverage Completion  
**Spec Reference**: specs/003-test-coverage-completion/plan.md  
**Target**: 100% API endpoint coverage (24/24 endpoints)  
**Priority**: P1 (Constitutional Requirement)

---

## Phase 1: Tags Integration Tests (Priority: P1)

### Task 1.1: Create tags.test.ts Test File Structure
**Estimated Time**: 15 minutes  
**Priority**: P1

**Steps**:
- [ ] Create `backend/tests/integration/tags.test.ts`
- [ ] Add imports (request, testDb helpers, testApp, tagsRoutes)
- [ ] Set up beforeAll, beforeEach, afterAll hooks
- [ ] Create test person, project, and app in beforeEach
- [ ] Add describe block: 'Tags API Integration Tests'

**Acceptance Criteria**:
- File structure matches workstreams.test.ts pattern
- Test setup/teardown works correctly
- File runs without errors (no tests yet)

**Files Changed**:
- `backend/tests/integration/tags.test.ts` (new)

---

### Task 1.2: Test GET /tags Endpoint
**Estimated Time**: 20 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Write test: 'should return empty array when no tags exist'
- [ ] Run test → verify it passes
- [ ] Write test: 'should return all tags for user project'
- [ ] Create 3 test tags with different colors and sortOrders
- [ ] Run test → verify tags returned correctly
- [ ] Write test: 'should return tags ordered by sortOrder ascending'
- [ ] Run test → verify ordering correct

**Acceptance Criteria**:
- All GET /tags tests pass
- Empty state tested
- Tag list with data tested
- Ordering by sortOrder verified

**Dependencies**: Task 1.1 complete

**Files Changed**:
- `backend/tests/integration/tags.test.ts`

---

### Task 1.3: Test POST /tags Endpoint
**Estimated Time**: 30 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Write test: 'should create new tag with required fields only'
- [ ] Verify: name, color, projectId returned, sortOrder auto-assigned
- [ ] Run test → verify it passes
- [ ] Write test: 'should create tag with emoji'
- [ ] Run test → verify emoji stored correctly
- [ ] Write test: 'should return 400 when name is missing'
- [ ] Run test → verify validation works
- [ ] Write test: 'should return 400 when name is empty'
- [ ] Run test → verify trimming validation
- [ ] Write test: 'should return 400 when color is missing'
- [ ] Run test → verify validation
- [ ] Write test: 'should return 400 when color is invalid format'
- [ ] Test with 'red', '#GGG', '#12345', etc.
- [ ] Run test → verify color validation
- [ ] Write test: 'should return 400 when name exceeds 50 characters'
- [ ] Run test → verify length limit
- [ ] Write test: 'should trim tag name'
- [ ] Run test → verify trimming works
- [ ] Write test: 'should auto-assign sortOrder to end of list'
- [ ] Create 2 tags, verify 3rd tag gets sortOrder = 2
- [ ] Run test → verify auto-assignment

**Acceptance Criteria**:
- Tag creation with valid data works
- All validation rules tested (name, color format, lengths)
- SortOrder auto-assignment tested
- Emoji support tested

**Dependencies**: Task 1.2 complete

**Files Changed**:
- `backend/tests/integration/tags.test.ts`

---

### Task 1.4: Test PUT /tags/reorder Endpoint
**Estimated Time**: 30 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Write test: 'should reorder tags with valid tag IDs'
- [ ] Create 3 tags with sortOrder 0, 1, 2
- [ ] Send PUT with [tag3.id, tag1.id, tag2.id]
- [ ] Verify sortOrder updated to 0, 1, 2 respectively
- [ ] Run test → verify reordering works
- [ ] Write test: 'should return 400 when tagIds is missing'
- [ ] Run test → verify validation
- [ ] Write test: 'should return 400 when tagIds is not an array'
- [ ] Run test → verify validation
- [ ] Write test: 'should return 400 when tagIds is empty array'
- [ ] Run test → verify validation
- [ ] Write test: 'should return 404 when tag ID does not exist'
- [ ] Run test → verify error handling
- [ ] Write test: 'should return 403 when trying to reorder another user tags'
- [ ] Create tags for another user
- [ ] Try to reorder them with current user
- [ ] Run test → verify security/isolation

**Acceptance Criteria**:
- Tag reordering works correctly
- Validation for missing/invalid tagIds array
- Security: cannot reorder other user's tags
- Non-existent tag IDs handled gracefully

**Dependencies**: Task 1.3 complete

**Files Changed**:
- `backend/tests/integration/tags.test.ts`

---

### Task 1.5: Test PUT /tags/:id Endpoint
**Estimated Time**: 25 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Write test: 'should update tag name'
- [ ] Create tag, update name, verify
- [ ] Run test → verify it passes
- [ ] Write test: 'should update tag color'
- [ ] Run test → verify it passes
- [ ] Write test: 'should update tag emoji'
- [ ] Run test → verify it passes
- [ ] Write test: 'should clear emoji by setting to null'
- [ ] Run test → verify nullable emoji
- [ ] Write test: 'should update multiple fields at once'
- [ ] Update name, color, emoji in one request
- [ ] Run test → verify partial updates work
- [ ] Write test: 'should return 404 when tag does not exist'
- [ ] Run test → verify error handling
- [ ] Write test: 'should return 400 when name is empty'
- [ ] Run test → verify validation
- [ ] Write test: 'should return 400 when color is invalid'
- [ ] Run test → verify validation
- [ ] Write test: 'should trim updated name'
- [ ] Run test → verify trimming

**Acceptance Criteria**:
- Tag updates work for name, color, emoji
- Partial updates supported
- Validation enforced on updates
- 404 for non-existent tags

**Dependencies**: Task 1.4 complete

**Files Changed**:
- `backend/tests/integration/tags.test.ts`

---

### Task 1.6: Test DELETE /tags/:id Endpoint
**Estimated Time**: 20 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Write test: 'should delete a tag'
- [ ] Create tag, delete it, verify 204 response
- [ ] Attempt to GET deleted tag → verify 404
- [ ] Run test → verify deletion works
- [ ] Write test: 'should return 404 when tag does not exist'
- [ ] Run test → verify error handling
- [ ] Write test: 'should clear tagId from workstreams when tag deleted'
- [ ] Create tag, assign to workstream
- [ ] Delete tag
- [ ] Verify workstream.tagId is now null
- [ ] Run test → verify cascading behavior
- [ ] Write test: 'should not delete tags from another user'
- [ ] Create tag for another user
- [ ] Try to delete with current user
- [ ] Verify 404 (not found because of isolation)
- [ ] Run test → verify data isolation

**Acceptance Criteria**:
- Tag deletion works
- Returns 404 for non-existent tags
- Cascading: workstream.tagId cleared when tag deleted
- Data isolation: cannot delete other user's tags

**Dependencies**: Task 1.5 complete

**Files Changed**:
- `backend/tests/integration/tags.test.ts`

---

### Task 1.7: Add Data Isolation Tests for Tags
**Estimated Time**: 15 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Add describe block: 'Data Isolation'
- [ ] Write test: 'should not access tags from another user project'
- [ ] Create second user, project, and tags
- [ ] GET /tags with first user credentials
- [ ] Verify only first user's tags returned
- [ ] Run test → verify isolation
- [ ] Write test: 'should not update tags from another user'
- [ ] Try to update other user's tag
- [ ] Verify 404 returned
- [ ] Run test → verify isolation

**Acceptance Criteria**:
- GET /tags returns only authenticated user's tags
- Cannot update other user's tags
- Cannot delete other user's tags (already tested in 1.6)

**Dependencies**: Task 1.6 complete

**Files Changed**:
- `backend/tests/integration/tags.test.ts`

---

### Task 1.8: Run and Verify Tags Tests
**Estimated Time**: 10 minutes  
**Priority**: P1

**Steps**:
- [ ] Run: `cd backend && npm test tags.test.ts`
- [ ] Verify all tests pass
- [ ] Review test coverage: all 5 endpoints tested
- [ ] Fix any failing tests
- [ ] Commit: `test: add integration tests for tags API (5 endpoints)`

**Acceptance Criteria**:
- All tags integration tests pass
- 5/5 tag endpoints have test coverage
- No test failures or warnings

**Dependencies**: Task 1.7 complete

**Files Changed**: None (verification only)

---

## Phase 2: Status Updates Integration Tests (Priority: P1)

### Task 2.1: Create statusUpdates.test.ts Test File Structure
**Estimated Time**: 15 minutes  
**Priority**: P1

**Steps**:
- [ ] Create `backend/tests/integration/statusUpdates.test.ts`
- [ ] Add imports (request, testDb helpers, testApp, statusUpdatesRoutes)
- [ ] Set up beforeAll, beforeEach, afterAll hooks
- [ ] Create test person, project, workstream, and app in beforeEach
- [ ] Add describe block: 'Status Updates API Integration Tests'

**Acceptance Criteria**:
- File structure matches workstreams.test.ts pattern
- Test workstream created in beforeEach (needed for status updates)
- Test setup/teardown works correctly

**Files Changed**:
- `backend/tests/integration/statusUpdates.test.ts` (new)

---

### Task 2.2: Test POST /status-updates Endpoint
**Estimated Time**: 35 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Write test: 'should create status update with required fields only'
- [ ] Send { workstreamId, status }
- [ ] Verify response has id, workstreamId, status, createdAt
- [ ] Run test → verify it passes
- [ ] Write test: 'should create status update with optional note'
- [ ] Send { workstreamId, status, note }
- [ ] Verify note is saved
- [ ] Run test → verify it passes
- [ ] Write test: 'should return 400 when workstreamId is missing'
- [ ] Run test → verify validation
- [ ] Write test: 'should return 400 when status is missing'
- [ ] Run test → verify validation
- [ ] Write test: 'should return 400 when status is empty'
- [ ] Send empty string or whitespace
- [ ] Run test → verify validation
- [ ] Write test: 'should return 400 when status exceeds 500 characters'
- [ ] Run test → verify length limit
- [ ] Write test: 'should return 400 when note exceeds 2000 characters'
- [ ] Run test → verify length limit
- [ ] Write test: 'should return 404 when workstream does not exist'
- [ ] Send invalid workstreamId UUID
- [ ] Run test → verify error handling
- [ ] Write test: 'should return 404 when workstream belongs to another user'
- [ ] Create workstream for another user
- [ ] Try to create status update for it
- [ ] Run test → verify data isolation
- [ ] Write test: 'should trim status text'
- [ ] Run test → verify trimming

**Acceptance Criteria**:
- Status update creation works with required and optional fields
- All validation rules tested
- Cannot create status update for non-existent or other user's workstream
- Status text trimmed properly

**Dependencies**: Task 2.1 complete

**Files Changed**:
- `backend/tests/integration/statusUpdates.test.ts`

---

### Task 2.3: Test GET /status-updates/workstreams/:workstreamId/status-updates Endpoint
**Estimated Time**: 25 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Write test: 'should return empty array when no status updates exist'
- [ ] Run test → verify it passes
- [ ] Write test: 'should return all status updates for workstream'
- [ ] Create 3 status updates for workstream
- [ ] Verify all 3 returned
- [ ] Run test → verify it passes
- [ ] Write test: 'should return status updates ordered by createdAt DESC'
- [ ] Create status updates at different times
- [ ] Verify newest first
- [ ] Run test → verify ordering
- [ ] Write test: 'should return 404 when workstream does not exist'
- [ ] Run test → verify error handling
- [ ] Write test: 'should return 404 when workstream belongs to another user'
- [ ] Create workstream for another user with status updates
- [ ] Try to GET its status updates
- [ ] Verify 404 (data isolation)
- [ ] Run test → verify isolation

**Acceptance Criteria**:
- Returns all status updates for a workstream
- Ordered by createdAt DESC (newest first)
- Returns 404 for non-existent or other user's workstream
- Empty array when no updates exist

**Dependencies**: Task 2.2 complete

**Files Changed**:
- `backend/tests/integration/statusUpdates.test.ts`

---

### Task 2.4: Test PUT /status-updates/:id Endpoint
**Estimated Time**: 25 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Write test: 'should update status text'
- [ ] Create status update, update status, verify
- [ ] Run test → verify it passes
- [ ] Write test: 'should update note'
- [ ] Run test → verify it passes
- [ ] Write test: 'should update both status and note'
- [ ] Run test → verify partial updates work
- [ ] Write test: 'should clear note by setting to null'
- [ ] Run test → verify nullable note
- [ ] Write test: 'should return 404 when status update does not exist'
- [ ] Run test → verify error handling
- [ ] Write test: 'should return 400 when status is empty'
- [ ] Run test → verify validation
- [ ] Write test: 'should return 400 when status exceeds 500 characters'
- [ ] Run test → verify validation
- [ ] Write test: 'should return 400 when note exceeds 2000 characters'
- [ ] Run test → verify validation
- [ ] Write test: 'should return 404 when status update belongs to another user'
- [ ] Create status update for another user
- [ ] Try to update it
- [ ] Run test → verify isolation
- [ ] Write test: 'should trim updated status'
- [ ] Run test → verify trimming

**Acceptance Criteria**:
- Status update modifications work
- Partial updates supported
- Validation enforced
- Cannot update other user's status updates

**Dependencies**: Task 2.3 complete

**Files Changed**:
- `backend/tests/integration/statusUpdates.test.ts`

---

### Task 2.5: Test DELETE /status-updates/:id Endpoint
**Estimated Time**: 20 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Write test: 'should delete a status update'
- [ ] Create status update, delete it, verify 204
- [ ] Try to GET deleted update → verify it's gone
- [ ] Run test → verify deletion works
- [ ] Write test: 'should return 404 when status update does not exist'
- [ ] Run test → verify error handling
- [ ] Write test: 'should not delete status updates from another user'
- [ ] Create status update for another user
- [ ] Try to delete it
- [ ] Verify 404 (isolation)
- [ ] Verify status update still exists for other user
- [ ] Run test → verify data isolation

**Acceptance Criteria**:
- Status update deletion works
- Returns 404 for non-existent updates
- Cannot delete other user's status updates

**Dependencies**: Task 2.4 complete

**Files Changed**:
- `backend/tests/integration/statusUpdates.test.ts`

---

### Task 2.6: Add Data Isolation Tests for Status Updates
**Estimated Time**: 15 minutes  
**Priority**: P1

**TDD Steps**:
- [ ] Add describe block: 'Data Isolation'
- [ ] Write test: 'should not access status updates from another user workstreams'
- [ ] Create another user with workstream and status updates
- [ ] GET with first user credentials
- [ ] Verify 404 (because workstream not found)
- [ ] Run test → verify isolation
- [ ] Write test: 'should only return status updates for own workstreams in GET list'
- [ ] Already covered in Task 2.3, add comment reference
- [ ] Run test → verify isolation

**Acceptance Criteria**:
- All status update operations respect user isolation
- Cannot access any data from other users

**Dependencies**: Task 2.5 complete

**Files Changed**:
- `backend/tests/integration/statusUpdates.test.ts`

---

### Task 2.7: Run and Verify Status Updates Tests
**Estimated Time**: 10 minutes  
**Priority**: P1

**Steps**:
- [ ] Run: `cd backend && npm test statusUpdates.test.ts`
- [ ] Verify all tests pass
- [ ] Review test coverage: all 4 endpoints tested
- [ ] Fix any failing tests
- [ ] Commit: `test: add integration tests for status updates API (4 endpoints)`

**Acceptance Criteria**:
- All status updates integration tests pass
- 4/4 status update endpoints have test coverage
- No test failures or warnings

**Dependencies**: Task 2.6 complete

**Files Changed**: None (verification only)

---

## Phase 3: Timeline Integration Tests (Priority: P2)

### Task 3.1: Create timeline.test.ts Test File Structure
**Estimated Time**: 10 minutes  
**Priority**: P2

**Steps**:
- [ ] Create `backend/tests/integration/timeline.test.ts`
- [ ] Add imports (request, testDb helpers, testApp, timelineRoutes)
- [ ] Set up beforeAll, beforeEach, afterAll hooks
- [ ] Create test person, project, app in beforeEach
- [ ] Add describe block: 'Timeline API Integration Tests'

**Acceptance Criteria**:
- File structure matches other integration tests
- Test setup/teardown works correctly

**Files Changed**:
- `backend/tests/integration/timeline.test.ts` (new)

---

### Task 3.2: Test GET /timeline Endpoint - Basic Functionality
**Estimated Time**: 20 minutes  
**Priority**: P2

**TDD Steps**:
- [ ] Write test: 'should return empty array when no status updates exist'
- [ ] Run test → verify it passes
- [ ] Write test: 'should return all status updates for user project'
- [ ] Create 2 workstreams with status updates
- [ ] GET /timeline
- [ ] Verify all status updates returned
- [ ] Run test → verify it passes
- [ ] Write test: 'should return status updates ordered by createdAt DESC'
- [ ] Create status updates at different timestamps
- [ ] Verify newest first
- [ ] Run test → verify ordering
- [ ] Write test: 'should include workstream and tag information'
- [ ] Create tagged workstream with status update
- [ ] GET /timeline
- [ ] Verify response includes workstream.name, tag.name, tag.color
- [ ] Run test → verify data structure

**Acceptance Criteria**:
- Returns all status updates for user
- Ordered by createdAt DESC
- Includes workstream and tag data in response
- Empty array when no data

**Dependencies**: Task 3.1 complete

**Files Changed**:
- `backend/tests/integration/timeline.test.ts`

---

### Task 3.3: Test GET /timeline Endpoint - Date Filters
**Estimated Time**: 25 minutes  
**Priority**: P2

**TDD Steps**:
- [ ] Write test: 'should filter by startDate'
- [ ] Create status updates on different dates
- [ ] GET /timeline?startDate=YYYY-MM-DD
- [ ] Verify only updates >= startDate returned
- [ ] Run test → verify filtering
- [ ] Write test: 'should filter by endDate'
- [ ] GET /timeline?endDate=YYYY-MM-DD
- [ ] Verify only updates <= endDate returned
- [ ] Run test → verify filtering
- [ ] Write test: 'should filter by date range (startDate and endDate)'
- [ ] GET /timeline?startDate=X&endDate=Y
- [ ] Verify only updates within range
- [ ] Run test → verify filtering
- [ ] Write test: 'should return 400 when startDate format is invalid'
- [ ] Send invalid date string
- [ ] Run test → verify validation
- [ ] Write test: 'should return 400 when endDate format is invalid'
- [ ] Run test → verify validation
- [ ] Write test: 'should return empty array when no updates in date range'
- [ ] Run test → verify edge case

**Acceptance Criteria**:
- Date filtering works correctly
- Supports startDate, endDate, and date range
- Invalid date formats return 400
- Empty results handled gracefully

**Dependencies**: Task 3.2 complete

**Files Changed**:
- `backend/tests/integration/timeline.test.ts`

---

### Task 3.4: Test GET /timeline Endpoint - Tag Filters
**Estimated Time**: 25 minutes  
**Priority**: P2

**TDD Steps**:
- [ ] Write test: 'should filter by single tagId'
- [ ] Create workstreams with different tags
- [ ] Each with status updates
- [ ] GET /timeline?tagIds=TAG_ID
- [ ] Verify only status updates for workstreams with that tag
- [ ] Run test → verify filtering
- [ ] Write test: 'should filter by multiple tagIds (comma-separated)'
- [ ] GET /timeline?tagIds=TAG1,TAG2
- [ ] Verify status updates for workstreams with either tag
- [ ] Run test → verify filtering
- [ ] Write test: 'should return empty array when no workstreams have specified tags'
- [ ] Run test → verify edge case
- [ ] Write test: 'should combine date and tag filters'
- [ ] GET /timeline?startDate=X&tagIds=TAG1
- [ ] Verify both filters applied (AND logic)
- [ ] Run test → verify combined filtering
- [ ] Write test: 'should handle invalid tag ID format gracefully'
- [ ] Send non-UUID tag ID
- [ ] Verify empty result or 400 (check implementation)
- [ ] Run test → verify error handling

**Acceptance Criteria**:
- Tag filtering works for single and multiple tags
- Combines with date filters correctly
- Invalid tag IDs handled gracefully
- Empty results when no matches

**Dependencies**: Task 3.3 complete

**Files Changed**:
- `backend/tests/integration/timeline.test.ts`

---

### Task 3.5: Add Data Isolation Tests for Timeline
**Estimated Time**: 15 minutes  
**Priority**: P2

**TDD Steps**:
- [ ] Add describe block: 'Data Isolation'
- [ ] Write test: 'should only return status updates from own project'
- [ ] Create another user with workstreams and status updates
- [ ] GET /timeline with first user credentials
- [ ] Verify only first user's status updates returned
- [ ] Run test → verify isolation
- [ ] Write test: 'should not include other user data in tag/date filters'
- [ ] Create similar data for two users
- [ ] Apply filters, verify no cross-contamination
- [ ] Run test → verify isolation

**Acceptance Criteria**:
- Timeline only shows authenticated user's data
- Filters do not leak other user's data
- Complete data isolation verified

**Dependencies**: Task 3.4 complete

**Files Changed**:
- `backend/tests/integration/timeline.test.ts`

---

### Task 3.6: Run and Verify Timeline Tests
**Estimated Time**: 10 minutes  
**Priority**: P2

**Steps**:
- [ ] Run: `cd backend && npm test timeline.test.ts`
- [ ] Verify all tests pass
- [ ] Review test coverage: all filter combinations tested
- [ ] Fix any failing tests
- [ ] Commit: `test: add integration tests for timeline API (1 endpoint, all filters)`

**Acceptance Criteria**:
- All timeline integration tests pass
- 1/1 timeline endpoint tested with all filter combinations
- No test failures or warnings

**Dependencies**: Task 3.5 complete

**Files Changed**: None (verification only)

---

## Phase 4: Health Check Integration Test (Priority: P3)

### Task 4.1: Create and Test health.test.ts
**Estimated Time**: 15 minutes  
**Priority**: P3

**Steps**:
- [ ] Create `backend/tests/integration/health.test.ts`
- [ ] Add imports (request, express, healthRoutes)
- [ ] Create simple app (no authentication needed for health check)
- [ ] Write test: 'should return 200 status'
- [ ] Run test → verify it passes
- [ ] Write test: 'should return health status object'
- [ ] Verify response has expected structure (status: 'ok', timestamp, etc.)
- [ ] Run test → verify response structure
- [ ] Write test: 'should not require authentication'
- [ ] GET without auth
- [ ] Verify 200 response
- [ ] Run test → verify public access
- [ ] Run all tests: `npm test health.test.ts`
- [ ] Verify all pass
- [ ] Commit: `test: add integration test for health check endpoint`

**Acceptance Criteria**:
- Health check endpoint tested
- Returns 200 and expected JSON structure
- Public endpoint (no auth required)
- All tests pass

**Dependencies**: None (independent)

**Files Changed**:
- `backend/tests/integration/health.test.ts` (new)

---

## Phase 5: Auth Test Enhancements (Priority: P3)

### Task 5.1: Add Missing Auth Tests
**Estimated Time**: 30 minutes  
**Priority**: P3

**Steps**:
- [ ] Open `backend/tests/integration/auth.test.ts`
- [ ] Add describe block: 'GET /auth/debug'
- [ ] Write test: 'should return session information'
- [ ] Mock authenticated session
- [ ] GET /auth/debug
- [ ] Verify response contains session data
- [ ] Run test → verify it passes
- [ ] Write test: 'should return session even when not authenticated'
- [ ] GET without auth
- [ ] Verify response (check what endpoint returns)
- [ ] Run test → verify behavior
- [ ] Enhance describe block: 'POST /auth/logout'
- [ ] Write test: 'should clear session on logout'
- [ ] Create authenticated session
- [ ] POST /auth/logout
- [ ] Verify session cleared (GET /auth/user returns 401)
- [ ] Run test → verify logout works
- [ ] Write test: 'should return success even when not logged in'
- [ ] POST /auth/logout without session
- [ ] Verify 200 response (idempotent)
- [ ] Run test → verify idempotency
- [ ] Run all auth tests: `npm test auth.test.ts`
- [ ] Verify all pass
- [ ] Commit: `test: enhance auth integration tests (debug endpoint, logout verification)`

**Acceptance Criteria**:
- Debug endpoint tested
- Logout properly tested with session verification
- All auth tests pass
- 5/5 auth endpoints have test coverage

**Dependencies**: None (enhancement to existing file)

**Files Changed**:
- `backend/tests/integration/auth.test.ts`

---

## Phase 6: Final Verification (Priority: P1)

### Task 6.1: Run Full Test Suite
**Estimated Time**: 15 minutes  
**Priority**: P1

**Steps**:
- [ ] Run all backend tests: `cd backend && npm test`
- [ ] Verify all integration tests pass:
  - [ ] auth.test.ts (5 endpoints)
  - [ ] oauth-flow.test.ts (OAuth flow verification)
  - [ ] workstreams.test.ts (8 endpoints)
  - [ ] tags.test.ts (5 endpoints)
  - [ ] statusUpdates.test.ts (4 endpoints)
  - [ ] timeline.test.ts (1 endpoint)
  - [ ] health.test.ts (1 endpoint)
- [ ] Count total endpoints covered: should be 24/24
- [ ] Review any failures and fix
- [ ] Document test results

**Acceptance Criteria**:
- ✅ All integration tests pass
- ✅ 24/24 endpoints have integration test coverage (100%)
- ✅ No test failures or warnings
- ✅ Constitutional requirement met

**Dependencies**: All previous tasks complete

**Files Changed**: None (verification only)

---

### Task 6.2: Update Documentation
**Estimated Time**: 15 minutes  
**Priority**: P2

**Steps**:
- [ ] Update `docs/DEVELOPMENT.md` if needed
- [ ] Add note: "Backend Integration Tests: 100% coverage achieved"
- [ ] Document test file structure in README or docs
- [ ] List all integration test files:
  - auth.test.ts
  - oauth-flow.test.ts
  - workstreams.test.ts
  - tags.test.ts
  - statusUpdates.test.ts
  - timeline.test.ts
  - health.test.ts
- [ ] Commit: `docs: update testing documentation with 100% endpoint coverage`

**Acceptance Criteria**:
- Documentation reflects current test state
- Test coverage milestone documented
- Clear guide for future test additions

**Dependencies**: Task 6.1 complete

**Files Changed**:
- `docs/DEVELOPMENT.md` (or appropriate doc file)

---

### Task 6.3: Create Completion Summary
**Estimated Time**: 10 minutes  
**Priority**: P2

**Steps**:
- [ ] Create `specs/003-test-coverage-completion/COMPLETION.md`
- [ ] Document:
  - Before state: 10/24 endpoints (42%)
  - After state: 24/24 endpoints (100%)
  - Test files created: 4 new files
  - Test files enhanced: 1 file
  - Total test cases added: ~estimate count
  - Constitutional compliance: ✅ ACHIEVED
- [ ] Add metrics: total tests, total assertions, execution time
- [ ] List any bugs discovered during testing
- [ ] Commit: `docs: add completion summary for test coverage initiative`

**Acceptance Criteria**:
- Completion document created
- Metrics captured
- Before/after comparison documented
- Constitutional compliance confirmed

**Dependencies**: Task 6.2 complete

**Files Changed**:
- `specs/003-test-coverage-completion/COMPLETION.md` (new)

---

## Summary

**Total Tasks**: 25 tasks across 6 phases  
**Estimated Total Time**: 6 hours  
**Priority Breakdown**:
- P1 Tasks: 19 tasks (core implementation)
- P2 Tasks: 4 tasks (timeline + docs)
- P3 Tasks: 2 tasks (health + auth enhancements)

**Deliverables**:
- ✅ 4 new integration test files (tags, statusUpdates, timeline, health)
- ✅ 1 enhanced test file (auth)
- ✅ 100% endpoint coverage (24/24 endpoints)
- ✅ Documentation updates
- ✅ Completion summary

**Success Criteria**:
- All 24 API endpoints have integration tests
- All tests pass in test suite
- Constitutional compliance achieved
- Documentation updated
- Zero regressions introduced
