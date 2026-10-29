# Changelog

## 0.1.4

- Move discussion history into a searchable drawer with status, selection and deletion.
- Keep the full roundtable for new discussions and use a compact role strip while reading.
- Use one main reading scroller with a persistent, collapsible question composer and new-message navigation.
- Add in-place follow-ups, per-discussion question drafts, quick summary navigation and summary copying.
- Keep export and deletion in a secondary actions menu and improve small-text readability.

## 0.1.3

- Prevent the roundtable caption from overlapping role status text in completed discussions.
- Let the role area and table caption reserve their own space across panel widths and larger text sizes.

## 0.1.2

- Follow the Harness light, dark and custom themes through native semantic color tokens.
- Match native page, card, input and button surfaces; remove the fixed purple and gold theme.
- Preserve role colors while adapting their contrast to the active theme.

## 0.1.1

- Declare a minimum Harness version of 0.1.5-rc.1 without an upper bound.
- Support both the 0.1 strict RPC schema and the 0.2 lazy codec factory.
- Verify native runtime integration on 0.1.5-rc.1 and 0.2.1-rc.3.
- Include two-round role discussions, follow-ups, retries, votes, summaries and persisted history.

The initial public release includes prebuilt browser code and a prebuilt installation package. Model-stream checks use mocks; native UI checks do not make paid model requests.
