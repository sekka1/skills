# Sprouts Website Automation Knowledge Base

This document captures findings, edge cases, and behavioral patterns observed when automating the Sprouts Farmers Market website.

## Critical Findings

### Issue #1: Store Selection Not Persisting (CRITICAL)

**Discovered:** 2026-04-24

**Symptom:** After clicking "Set as my store" and closing the modal, the selected store reverts to the default store (Scottsdale - Shea Blvd, Store #2).

**Root Cause Analysis:**

1. **The Problem:** Clicking the green "Set as my store" button does NOT immediately finalize the store selection
   - After clicking "Set as my store", the modal remains open showing the same store list
   - The "Set as my store" button stays green and clickable (no visual feedback that selection was made)
   - When pressing Escape to close the modal, this CANCELS the selection rather than confirming it
   - Result: Store reverts to default instead of the newly selected store

2. **Evidence:**
   - Screenshot `sprouts-debug-step8-done.png`: Shows modal still open after "Set as my store" click
   - Screenshot `sprouts-debug-step8a-modal-closed.png`: Shows store still set to #2 (default) after modal closed
   - Test logs: Store verification always returns "Scottsdale - Shea Blvd. (Store #2)" regardless of which store was clicked

3. **Missing Step:** There must be an additional confirmation required after clicking "Set as my store":
   - Option A: Wait for a confirmation message/toast to appear
   - Option B: Look for and click a "Shop this store" button (Step 8b searches for this but doesn't find it)
   - Option C: Wait for the modal to close automatically
   - Option D: There's a different close mechanism (not Escape) that confirms the selection

**Current Code Flow:**
```
Step 8: Click "Set as my store" → Button clicked successfully
Step 8a: Press Escape to close modal → WRONG - This cancels the selection!
Step 8b: Look for "Shop this store" → Not found
Step 9: Wait for page update → Times out (no update happens because selection was cancelled)
Step 10: Verify → Returns wrong store (#2 instead of target)
```

**Attempted Fixes:**
- ✅ Added Step 9: Wait for page navigation/update before verification (didn't help - selection was already cancelled)
- ❌ Pressing Escape to close modal - This is the problem, not the solution!

**Next Steps to Try:**
1. After clicking "Set as my store", wait for visual confirmation (button color change, loading spinner, etc.)
2. Look for a different way to confirm/close the modal (e.g., click outside modal, look for a "Continue" button)
3. Check if clicking "Set as my store" triggers an async operation that needs time to complete before closing modal
4. Investigate if there's a success toast/notification that appears
5. Try NOT closing the modal manually - let it close automatically or navigate away
6. Look for DOM mutations that indicate the store was set successfully

## Website Behavioral Patterns

### Pattern #1: Multiple Paths to Same Functionality

The Sprouts website may show different UI flows for the same action depending on:
- User session state
- Time of day / server-side A/B tests
- Browser state / cookies
- Geographic location

**Implication:** Need multi-path approach with fallbacks for each critical action.

### Pattern #2: Async State Management

Store selection appears to use React state management with async updates:
- Clicking "Set as my store" likely triggers an API call
- The UI may not update immediately
- Modal behavior may be tied to completion of async operations

**Implication:** Need to wait for API completion signals, not just DOM states.

## Edge Cases Encountered

### Edge Case #1: Store Number Parsing

The store button text format varies:
- Format 1: `"In-Store · Las Vegas - Centennial (Store #506)"`
- Format 2: `"In-Store · open 7am - 10pm Scottsdale - Shea Blvd. (Store #2)"`

The parser handles this with regex: `/#(\d{3,4})/` to extract 3-4 digit store numbers.

### Edge Case #2: Default Store Selection

When first visiting the site, it defaults to:
- **Store #2:** Scottsdale - Shea Blvd. (Phoenix area)
- This appears to be a hardcoded default, not based on geolocation

## Testing Notes

### Integration Test Challenges

1. **Browser State Contamination:** Tests running in sequence may share browser state
   - **Solution:** Create new browser context/page for each test OR clear cookies between tests

2. **Network Timing:** API calls for store selection may have variable latency
   - **Solution:** Use retry logic with exponential backoff

3. **Screenshot Debugging:** Screenshots are essential for diagnosing UI state issues
   - All critical steps should have screenshots
   - Compare "before" and "after" states to confirm changes

## Recommendations

### For Future Developers/Agents

1. **Always validate the result:** After any action, verify it succeeded before proceeding
2. **Expect variability:** The website UI may change between runs - maintain multiple approaches
3. **Debug with screenshots:** Visual confirmation is often more reliable than DOM queries alone
4. **Wait for async operations:** Don't assume DOM state changes are instantaneous
5. **Test in isolation:** Browser state from previous tests can cause false negatives

### For This Specific Issue

**PRIORITY FIX:** The store selection flow needs to be completely reworked:
1. Click "Set as my store"
2. **DO NOT press Escape** - This cancels the selection!
3. Find the correct confirmation mechanism
4. Wait for visual/DOM confirmation that store was set
5. Only then proceed to verification

---

**Last Updated:** 2026-04-24
**Status:** Active investigation - Store selection broken, fix in progress
