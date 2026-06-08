/**
 * emp-exit dummy/test seed.
 *
 * Inserts realistic exit-management test data for the existing dev tenant so the
 * UI can be exercised across every status. Wired to the REAL empcloud records
 * that already exist locally:
 *   - organization_id = 3  (TechNova Solutions)
 *   - employees        = users.id 12..21 (Rahul, Priya, Sneha, Arjun, etc.)
 *
 * Notes on the data layer (see knex.adapter.ts):
 *   - This seed runs via `npm run db:seed` (tsx src/db/seed.ts). The `knex` arg
 *     is bound to the emp_exit DB. We do NOT touch empcloud here — its org/users
 *     already exist; we only reference their ids.
 *   - emp_exit PKs are app-generated UUIDs (no DB autoincrement, no default), so
 *     every row supplies an explicit `id`.
 *   - created_at/updated_at are omitted (DB CURRENT_TIMESTAMP defaults apply).
 *   - Monetary amounts are BIGINT in the smallest unit (paise).
 *   - Idempotent: all org-3 exit data is deleted (reverse-FK order) then
 *     re-inserted, so re-running is safe.
 */
import type { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";

const ORG_ID = 3;

// Real empcloud users.id values for TechNova (org 3).
const EMP = {
  ananya: 12,   // org_admin (acts as initiator/approver)
  rahul: 13,    // employee
  priya: 14,    // employee
  vikram: 15,   // hr_manager
  sneha: 16,    // employee
  arjun: 17,    // employee
  meera: 18,    // hr_manager (interviewer)
  karthik: 19,  // employee
  divya: 20,    // employee
  aditya: 21,   // employee
};

export async function seed(knex: Knex): Promise<void> {
  // ── Idempotency: wipe org-3 exit data (RESTRICT/no-FK children first, then
  //    exit_requests which cascades the rest, then org-config tables). Child
  //    tables without organization_id are scoped via an exit_requests subquery
  //    so moving UUIDs don't matter. ─────────────────────────────────────────
  const exitSub = () => knex("exit_requests").where({ organization_id: ORG_ID }).select("id");

  await knex("rehire_requests").where({ organization_id: ORG_ID }).del().catch(() => {});
  await knex("notice_buyout_requests").where({ organization_id: ORG_ID }).del().catch(() => {});
  await knex("generated_letters").whereIn("exit_request_id", exitSub()).del().catch(() => {});
  await knex("alumni_profiles").where({ organization_id: ORG_ID }).del().catch(() => {});
  await knex("audit_logs").where({ organization_id: ORG_ID }).del().catch(() => {});
  await knex("flight_risk_scores").where({ organization_id: ORG_ID }).del().catch(() => {});
  await knex("attrition_predictions").where({ organization_id: ORG_ID }).del().catch(() => {});
  await knex("kt_items").whereIn("kt_id", knex("knowledge_transfers").whereIn("exit_request_id", exitSub()).select("id")).del().catch(() => {});
  // exit_requests delete cascades: checklist_instances, clearance_records,
  // exit_interviews(+responses), fnf_settlements, asset_returns, knowledge_transfers(+kt_items).
  await knex("exit_requests").where({ organization_id: ORG_ID }).del();
  await knex("clearance_departments").where({ organization_id: ORG_ID }).del();
  await knex("exit_checklist_templates").where({ organization_id: ORG_ID }).del();
  await knex("exit_interview_templates").where({ organization_id: ORG_ID }).del();
  await knex("letter_templates").where({ organization_id: ORG_ID }).del();
  await knex("exit_settings").where({ organization_id: ORG_ID }).del();

  // ── Org-level config ───────────────────────────────────────────────────────
  await knex("exit_settings").insert({
    id: uuidv4(),
    organization_id: ORG_ID,
    default_notice_period_days: 30,
    auto_initiate_clearance: 1,
    require_exit_interview: 1,
    fnf_approval_required: 1,
    alumni_opt_in_default: 1,
    email_on_exit_initiated: 1,
    email_on_clearance_pending: 1,
    email_on_clearance_completed: 1,
    email_on_fnf_calculated: 1,
    email_on_fnf_approved: 1,
    email_on_exit_completed: 1,
  });

  // Clearance departments (capture ids for clearance_records).
  const clrDept = {
    it: uuidv4(), finance: uuidv4(), hr: uuidv4(),
    manager: uuidv4(), library: uuidv4(), security: uuidv4(),
  };
  await knex("clearance_departments").insert([
    { id: clrDept.it, organization_id: ORG_ID, name: "IT / Systems", approver_role: "it_admin", sort_order: 1, is_active: 1 },
    { id: clrDept.finance, organization_id: ORG_ID, name: "Finance / Accounts", approver_role: "finance", sort_order: 2, is_active: 1 },
    { id: clrDept.hr, organization_id: ORG_ID, name: "HR / Admin", approver_role: "hr_admin", sort_order: 3, is_active: 1 },
    { id: clrDept.manager, organization_id: ORG_ID, name: "Reporting Manager", approver_role: "manager", sort_order: 4, is_active: 1 },
    { id: clrDept.library, organization_id: ORG_ID, name: "Library / Knowledge Base", approver_role: "admin", sort_order: 5, is_active: 1 },
    { id: clrDept.security, organization_id: ORG_ID, name: "Security / Facilities", approver_role: "admin", sort_order: 6, is_active: 1 },
  ]);

  // Interview template + questions.
  const interviewTpl = uuidv4();
  await knex("exit_interview_templates").insert({
    id: interviewTpl, organization_id: ORG_ID, name: "Standard Exit Interview", is_default: 1, is_active: 1,
  });
  const q = { reason: uuidv4(), experience: uuidv4(), recommend: uuidv4(), mgmt: uuidv4() };
  await knex("exit_interview_questions").insert([
    { id: q.reason, template_id: interviewTpl, question_text: "What is the primary reason for leaving?", question_type: "text", sort_order: 1, is_required: 1 },
    { id: q.experience, template_id: interviewTpl, question_text: "Rate your overall experience", question_type: "rating", sort_order: 2, is_required: 0 },
    { id: q.recommend, template_id: interviewTpl, question_text: "Would you recommend us as an employer?", question_type: "yes_no", sort_order: 3, is_required: 0 },
    { id: q.mgmt, template_id: interviewTpl, question_text: "How would you rate management support?", question_type: "rating", sort_order: 4, is_required: 0 },
  ]);

  // ── Exit requests (root) — one per status to exercise the full lifecycle ────
  const exit = {
    priya: uuidv4(), rahul: uuidv4(), divya: uuidv4(),
    vikram: uuidv4(), sneha: uuidv4(), arjun: uuidv4(), karthik: uuidv4(),
  };
  await knex("exit_requests").insert([
    { id: exit.priya, organization_id: ORG_ID, employee_id: EMP.priya, exit_type: "resignation", status: "clearance_pending", reason_category: "better_opportunity", reason_detail: "Accepted a Senior Engineer offer at a product company.", initiated_by: EMP.ananya, approved_by: EMP.ananya, resignation_date: "2026-05-02", notice_start_date: "2026-05-02", last_working_date: "2026-06-01", notice_period_days: 30, notice_period_waived: 0 },
    { id: exit.rahul, organization_id: ORG_ID, employee_id: EMP.rahul, exit_type: "resignation", status: "fnf_pending", reason_category: "compensation", reason_detail: "Compensation below market; declined counter-offer.", initiated_by: EMP.ananya, approved_by: EMP.ananya, resignation_date: "2026-04-15", notice_start_date: "2026-04-15", last_working_date: "2026-05-15", notice_period_days: 30, notice_period_waived: 0 },
    { id: exit.divya, organization_id: ORG_ID, employee_id: EMP.divya, exit_type: "retirement", status: "completed", reason_category: "retirement", reason_detail: "Superannuation at age 60.", initiated_by: EMP.ananya, approved_by: EMP.ananya, resignation_date: "2026-03-01", last_working_date: "2026-03-31", actual_exit_date: "2026-03-31", notice_period_days: 30, notice_period_waived: 0 },
    { id: exit.vikram, organization_id: ORG_ID, employee_id: EMP.vikram, exit_type: "termination", status: "fnf_processed", reason_category: "performance", reason_detail: "Terminated after PIP non-completion.", initiated_by: EMP.ananya, approved_by: EMP.ananya, last_working_date: "2026-05-20", notice_period_days: 0, notice_period_waived: 1 },
    { id: exit.sneha, organization_id: ORG_ID, employee_id: EMP.sneha, exit_type: "resignation", status: "initiated", reason_category: "relocation", reason_detail: "Spouse relocating to Bengaluru.", initiated_by: EMP.sneha, notice_period_days: 30, notice_period_waived: 0 },
    { id: exit.arjun, organization_id: ORG_ID, employee_id: EMP.arjun, exit_type: "end_of_contract", status: "notice_period", reason_category: "redundancy", reason_detail: "12-month fixed-term contract concluded.", initiated_by: EMP.ananya, resignation_date: "2026-05-01", notice_start_date: "2026-05-01", last_working_date: "2026-05-31", notice_period_days: 30, notice_period_waived: 0 },
    { id: exit.karthik, organization_id: ORG_ID, employee_id: EMP.karthik, exit_type: "resignation", status: "cancelled", reason_category: "personal", reason_detail: "Personal reasons.", initiated_by: EMP.karthik, notice_period_days: 30, notice_period_waived: 0, revoke_reason: "Withdrew resignation after manager discussion / retention." },
  ]);

  // ── Clearance records (Priya, multiple statuses) ────────────────────────────
  await knex("clearance_records").insert([
    { id: uuidv4(), exit_request_id: exit.priya, department_id: clrDept.it, status: "approved", approved_by: EMP.ananya, approved_at: knex.fn.now(), remarks: "All assets returned, accounts deactivated.", pending_amount: 0 },
    { id: uuidv4(), exit_request_id: exit.priya, department_id: clrDept.finance, status: "rejected", remarks: "Outstanding travel advance to be recovered in FnF.", pending_amount: 1200000 },
    { id: uuidv4(), exit_request_id: exit.priya, department_id: clrDept.hr, status: "pending", pending_amount: 0 },
    { id: uuidv4(), exit_request_id: exit.priya, department_id: clrDept.manager, status: "approved", approved_by: EMP.vikram, approved_at: knex.fn.now(), remarks: "Knowledge transfer complete.", pending_amount: 0 },
    { id: uuidv4(), exit_request_id: exit.priya, department_id: clrDept.library, status: "waived", remarks: "Not applicable for engineering team.", pending_amount: 0 },
    { id: uuidv4(), exit_request_id: exit.priya, department_id: clrDept.security, status: "pending", pending_amount: 0 },
  ]);

  // ── Exit interviews (+ responses for the completed one) ─────────────────────
  const rahulInterview = uuidv4();
  await knex("exit_interviews").insert([
    { id: uuidv4(), exit_request_id: exit.priya, template_id: interviewTpl, interviewer_id: EMP.meera, scheduled_date: "2026-05-28", status: "scheduled" },
    { id: rahulInterview, exit_request_id: exit.rahul, template_id: interviewTpl, interviewer_id: EMP.meera, scheduled_date: "2026-05-08", completed_date: "2026-05-10", status: "completed", overall_rating: 3, summary: "Cited compensation and limited growth. Praised team culture and manager support. Would consider returning if comp gap closes." },
    { id: uuidv4(), exit_request_id: exit.vikram, interviewer_id: null, status: "skipped" },
  ]);
  await knex("exit_interview_responses").insert([
    { id: uuidv4(), interview_id: rahulInterview, question_id: q.reason, answer_text: "Better compensation elsewhere." },
    { id: uuidv4(), interview_id: rahulInterview, question_id: q.experience, answer_rating: 4 },
    { id: uuidv4(), interview_id: rahulInterview, question_id: q.recommend, answer_text: "Yes" },
    { id: uuidv4(), interview_id: rahulInterview, question_id: q.mgmt, answer_rating: 3 },
  ]);

  // ── F&F settlements (paise) ─────────────────────────────────────────────────
  await knex("fnf_settlements").insert([
    { id: uuidv4(), exit_request_id: exit.priya, status: "calculated", basic_salary_due: 4500000, leave_encashment: 1800000, bonus_due: 0, gratuity: 0, notice_pay_recovery: 0, other_deductions: 0, other_earnings: 0, total_payable: 6300000, calculated_by: EMP.ananya },
    { id: uuidv4(), exit_request_id: exit.rahul, status: "approved", basic_salary_due: 5000000, leave_encashment: 1200000, bonus_due: 0, gratuity: 0, notice_pay_recovery: 0, other_deductions: 0, other_earnings: 0, total_payable: 6200000, calculated_by: EMP.ananya, approved_by: EMP.ananya },
    { id: uuidv4(), exit_request_id: exit.divya, status: "paid", basic_salary_due: 6000000, leave_encashment: 3000000, bonus_due: 0, gratuity: 9750000, notice_pay_recovery: 0, other_deductions: 0, other_earnings: 0, total_payable: 18750000, calculated_by: EMP.ananya, approved_by: EMP.ananya, paid_date: "2026-04-05", remarks: "Payment ref: NEFT-FNF-2026-0042" },
    { id: uuidv4(), exit_request_id: exit.vikram, status: "calculated", basic_salary_due: 4000000, leave_encashment: 0, bonus_due: 0, gratuity: 0, notice_pay_recovery: 2000000, other_deductions: 1200000, other_earnings: 0, total_payable: 800000, calculated_by: EMP.ananya, remarks: "Notice waived by employer; travel advance recovered." },
  ]);

  // ── Asset returns (Priya + Rahul, various statuses) ─────────────────────────
  await knex("asset_returns").insert([
    { id: uuidv4(), exit_request_id: exit.priya, category: "laptop", asset_name: "Dell Latitude 5430", asset_tag: "LAP-2231", status: "returned", returned_date: "2026-05-30", verified_by: EMP.ananya, condition_notes: "Good condition.", replacement_cost: 8500000 },
    { id: uuidv4(), exit_request_id: exit.priya, category: "phone", asset_name: "iPhone 13", asset_tag: "MOB-0098", status: "damaged", condition_notes: "Cracked screen; recovery deducted in FnF.", replacement_cost: 6500000 },
    { id: uuidv4(), exit_request_id: exit.rahul, category: "id_card", asset_name: "Employee ID Badge", asset_tag: "ID-1145", status: "returned", returned_date: "2026-05-15", verified_by: EMP.ananya, replacement_cost: 0 },
    { id: uuidv4(), exit_request_id: exit.rahul, category: "access_card", asset_name: "Building Access Card", asset_tag: "AC-3320", status: "pending", replacement_cost: 0 },
    { id: uuidv4(), exit_request_id: exit.rahul, category: "phone", asset_name: "Samsung A52", asset_tag: "MOB-0210", status: "lost", condition_notes: "Reported lost; replacement cost recovered.", replacement_cost: 3000000 },
  ]);

  // ── Knowledge transfers (+ items) ───────────────────────────────────────────
  const priyaKt = uuidv4();
  await knex("knowledge_transfers").insert([
    { id: priyaKt, exit_request_id: exit.priya, assignee_id: EMP.rahul, status: "in_progress", due_date: "2026-05-29", notes: "Handover of Payments microservice ownership." },
    { id: uuidv4(), exit_request_id: exit.rahul, assignee_id: EMP.sneha, status: "completed", completed_date: "2026-05-12", notes: "Full handover signed off by manager." },
    { id: uuidv4(), exit_request_id: exit.sneha, assignee_id: null, status: "not_started" },
  ]);
  await knex("kt_items").insert([
    { id: uuidv4(), kt_id: priyaKt, title: "Document payment-gateway integration", status: "completed", document_url: "https://wiki.internal/kt/priya-payments", completed_at: knex.fn.now() },
    { id: uuidv4(), kt_id: priyaKt, title: "Pair-program on on-call runbook", status: "in_progress" },
    { id: uuidv4(), kt_id: priyaKt, title: "Transfer repo & cloud access ownership", status: "not_started" },
  ]);

  // eslint-disable-next-line no-console
  console.log(`[seed] emp-exit dummy data inserted for organization_id=${ORG_ID} (7 exit requests + clearances, interviews, F&F, assets, KT).`);
}
