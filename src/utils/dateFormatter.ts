/**
 * Utility functions for date formatting
 */

/**
 * Convert ISO date string to locale-independent AppleScript date construction
 *
 * PROBLEM: AppleScript's `date "28 January 2026"` is locale-dependent.
 * English month names fail on German systems with error -30720.
 *
 * ADDITIONAL PROBLEM: Setting date properties inside a `tell application` block
 * causes error -1723 (errAEPrivilegeViolation) because AppleScript tries to resolve
 * `year of tempDate` as an application property instead of a system date property.
 *
 * SOLUTION: Construct dates by setting numeric properties (year, month, day, time)
 * which is locale-independent, AND generate the construction code to run OUTSIDE
 * the tell application block, then pass the constructed date variable into the block.
 *
 * @param isoDate ISO date string (e.g., "2026-01-09" or "2026-01-09T12:00:00")
 * @param varName Optional variable name (default: "tempDate")
 * @returns AppleScript code that constructs the date in the specified variable
 * @throws Error if the date string is invalid
 */
export function formatDateForAppleScript(isoDate: string, varName: string = 'tempDate'): string {
	if (!isoDate || isoDate.trim() === '') {
		throw new Error('Date string cannot be empty');
	}

	const trimmed = isoDate.trim();

	let year: number;
	let month: number;
	let day: number;
	let hours: number;
	let minutes: number;
	let seconds: number;

	// Date-only strings like "2026-06-01" must be interpreted as local midnight,
	// not UTC midnight. `new Date("2026-06-01")` parses to UTC, which means in
	// PT (UTC-7/-8) the local components resolve to the PREVIOUS day. That
	// off-by-one is silent and frequent: a user passing dueDate "2026-06-01"
	// would see the task land on 5/31 in OmniFocus. We parse the components
	// directly so the resulting AppleScript date is local midnight of the
	// requested day, with no timezone shift.
	const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	if (dateOnlyMatch) {
		// For date-only inputs we keep the user's components verbatim and let
		// AppleScript handle any roll-over (matching the existing behaviour for
		// `2026-02-29` style inputs in the time-component branch below).
		year = Number(dateOnlyMatch[1]);
		month = Number(dateOnlyMatch[2]);
		day = Number(dateOnlyMatch[3]);
		hours = 0;
		minutes = 0;
		seconds = 0;
	} else {
		// Parse the ISO date string (with time component) — `new Date` is the
		// right choice here; the timezone is either explicit in the string or
		// the user's locale, and we read components in local time below.
		const date = new Date(trimmed);

		if (isNaN(date.getTime())) {
			throw new Error(`Invalid date string: ${isoDate}`);
		}

		year = date.getFullYear();
		month = date.getMonth() + 1; // JavaScript months are 0-indexed, AppleScript is 1-indexed
		day = date.getDate();
		hours = date.getHours();
		minutes = date.getMinutes();
		seconds = date.getSeconds();
	}

	// Calculate time in seconds since midnight for AppleScript's time property
	const timeInSeconds = hours * 3600 + minutes * 60 + seconds;

	// Generate AppleScript code to construct the date
	// NOTE: Set year first, then month, then day to avoid date rollover issues
	// (e.g., setting day to 31 when current month is February would cause problems)
	// IMPORTANT: This code must run OUTSIDE any `tell application` block to avoid
	// error -1723 where AppleScript tries to resolve date properties in app context
	return [
		`set ${varName} to current date`,
		`set year of ${varName} to ${year}`,
		`set month of ${varName} to ${month}`,
		`set day of ${varName} to ${day}`,
		`set time of ${varName} to ${timeInSeconds}`
	].join('\n')
}
