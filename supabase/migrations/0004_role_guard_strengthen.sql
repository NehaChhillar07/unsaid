-- 0004 — strengthen the server-side role-title guard (audit follow-up).
-- 0003 only blocked '@' and 7+ digit runs. But the role title is stamped on
-- EVERY post/comment via the public views, so a title like "rahul at google in
-- gurgaon" or "intern at infosys" (no @, no long digit run) self-doxxed past the
-- trigger. We now also hard-block high-confidence identity leaks: named
-- companies and named cities. The generic "at <word>" pattern stays advisory
-- only (client role-check) because it false-positives on "stay at home mom" /
-- "good at math" — blocking those in the permanent identity label would be worse.

create or replace function public.guard_role_title()
returns trigger
language plpgsql
as $$
begin
  -- contact info: any '@' (emails/handles) or a run of 7+ digits (phone-like)
  if new.role_title ~ '@' or new.role_title ~ '\d{7,}' then
    raise exception 'role title looks like contact info — keep it a feeling, not an identifier'
      using errcode = 'check_violation';
  end if;

  -- named employer (distinctive brands only — ambiguous common words like
  -- "apple"/"meta" stay advisory to avoid false blocks on real role titles)
  if new.role_title ~* '\m(google|facebook|instagram|amazon|infosys|tcs|tata consultancy|deloitte|kpmg|microsoft|wipro|accenture|flipkart|swiggy|zomato|paytm|phonepe|netflix|uber|goldman sachs|jp ?morgan|morgan stanley|mckinsey|pwc|ibm|adobe|salesforce|zoho|byju''?s|oyo|razorpay|zerodha|freshworks|cognizant|capgemini|hcl|tech mahindra|airtel)\M' then
    raise exception 'role title names a company — keep it about you, not where you work'
      using errcode = 'check_violation';
  end if;

  -- named city / location (city + a role narrows identity sharply)
  if new.role_title ~* '\m(gurgaon|gurugram|bangalore|bengaluru|mumbai|delhi|new delhi|noida|pune|hyderabad|chennai|kolkata|ahmedabad|jaipur|chandigarh|kochi|indore|lucknow|seattle|london|san francisco|nyc|new york|boston|chicago|toronto|berlin|amsterdam|dubai|singapore|sydney)\M' then
    raise exception 'role title gives away your city — try a broader title'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- trigger from 0003 already points at this function; no change needed there.
