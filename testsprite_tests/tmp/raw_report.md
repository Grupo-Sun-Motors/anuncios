
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** sun-motors-app - antigravit
- **Date:** 2025-12-11
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** User Authentication Success
- **Test Code:** [TC001_User_Authentication_Success.py](./TC001_User_Authentication_Success.py)
- **Test Error:** Login test failed: unable to login with valid credentials despite multiple attempts and account creation blocked. Session persistence could not be verified. Please verify credentials and backend authentication service.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://agdvozsqcrszflzsimyl.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://agdvozsqcrszflzsimyl.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[ERROR] Failed to load resource: the server responded with a status of 422 () (at https://agdvozsqcrszflzsimyl.supabase.co/auth/v1/signup:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://agdvozsqcrszflzsimyl.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/f2eea86f-2a9b-4fc7-ad67-20b8eb1aeffe
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** User Authentication Failure with Incorrect Credentials
- **Test Code:** [TC002_User_Authentication_Failure_with_Incorrect_Credentials.py](./TC002_User_Authentication_Failure_with_Incorrect_Credentials.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/bebafd23-b879-4c4f-a81e-ebccaa5ff7b8
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** Access Protected Routes Without Authentication
- **Test Code:** [TC003_Access_Protected_Routes_Without_Authentication.py](./TC003_Access_Protected_Routes_Without_Authentication.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/d13d46ad-48cd-43fd-a4f2-df9b06170bc2
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** Role-Based Access Control Enforcement on Routes
- **Test Code:** [TC004_Role_Based_Access_Control_Enforcement_on_Routes.py](./TC004_Role_Based_Access_Control_Enforcement_on_Routes.py)
- **Test Error:** Login attempts as ADM user failed due to invalid credentials. Please provide valid ADM user credentials to continue with the RBAC access verification task.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://agdvozsqcrszflzsimyl.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://agdvozsqcrszflzsimyl.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/d379dc1b-05f6-42ef-987a-12e8ba769788
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** Role-Based UI Element Permission Enforcement
- **Test Code:** [TC005_Role_Based_UI_Element_Permission_Enforcement.py](./TC005_Role_Based_UI_Element_Permission_Enforcement.py)
- **Test Error:** Unable to proceed with role-based UI verification because all login attempts for ADM user failed due to invalid credentials. Please provide valid credentials to continue testing or verify the login process separately. Task stopped.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://agdvozsqcrszflzsimyl.supabase.co/auth/v1/token?grant_type=password:0:0)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://agdvozsqcrszflzsimyl.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://agdvozsqcrszflzsimyl.supabase.co/auth/v1/token?grant_type=password:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/d0c93ed3-8bda-4b17-bbed-17b5e5cd7d90
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** Campaign Creation Wizard Normal Flow
- **Test Code:** [TC006_Campaign_Creation_Wizard_Normal_Flow.py](./TC006_Campaign_Creation_Wizard_Normal_Flow.py)
- **Test Error:** Tested the multi-step campaign creation wizard by logging in, navigating to Campaigns, and starting the wizard. Filled basic campaign info but encountered issues with budget input field that does not accept direct text input and requires alternative interaction. Data persistence between wizard sessions was not observed; fields reset when restarting wizard. Could not complete all steps or submit campaign successfully. Campaign overview page is functional and ready for new campaigns. Task partially completed due to budget input and persistence issues.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key. (at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=30a3d400:8294:14)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key. (at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=30a3d400:8294:14)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key. (at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=30a3d400:8294:14)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/c4068f65-77ff-4306-90f1-b7094747976a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** Campaign Creation Wizard Handles Incomplete Data
- **Test Code:** [TC007_Campaign_Creation_Wizard_Handles_Incomplete_Data.py](./TC007_Campaign_Creation_Wizard_Handles_Incomplete_Data.py)
- **Test Error:** Stopped testing due to login validation issue blocking access to campaign creation wizard. Reported the issue for resolution.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[ERROR] Failed to load resource: the server responded with a status of 400 () (at https://agdvozsqcrszflzsimyl.supabase.co/auth/v1/token?grant_type=password:0:0)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/b2812ccb-b504-490e-a1ac-56d5bc108450
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** Campaign Wizard Data Persistence During Navigation
- **Test Code:** [TC008_Campaign_Wizard_Data_Persistence_During_Navigation.py](./TC008_Campaign_Wizard_Data_Persistence_During_Navigation.py)
- **Test Error:** The campaign wizard step failed to load, preventing further testing of campaign data persistence. Reported the issue and stopped testing.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/d5687537-5e15-44fe-9022-d06f073909a6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** Leads Import via CSV Valid Data
- **Test Code:** [TC009_Leads_Import_via_CSV_Valid_Data.py](./TC009_Leads_Import_via_CSV_Valid_Data.py)
- **Test Error:** The test for CSV import linked to existing campaigns and accounts was partially completed. We successfully navigated to the Leads management page, opened the 'Importação em Massa' modal, and selected the 'Conta de Anúncio' dropdown option 'Kia - Google - Kia Sun Motors'. However, automated file upload is not supported by the file input element, preventing full automation of the CSV file upload and import process. Manual intervention is required to upload a valid CSV file and click 'Importar' to complete the import. After that, verification of the imported leads and success notification should be done manually. Due to this limitation, the task is not fully finished.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/5eab6862-649b-4f80-afd4-1aae21355e8c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** Leads Import via CSV Handles Invalid Data
- **Test Code:** [TC010_Leads_Import_via_CSV_Handles_Invalid_Data.py](./TC010_Leads_Import_via_CSV_Handles_Invalid_Data.py)
- **Test Error:** The CSV import was completed with a file containing invalid or unmatched lead records. The leads list after import shows the same number of leads as before (11), indicating no new leads were added or invalid records were skipped silently. However, no visible warnings, error messages, or import summary showing counts of imported and ignored entries were displayed on the page. Therefore, the system does not provide clear feedback or warnings about invalid or unmatched lead records during CSV import, and it is not evident that such records are ignored. Test result: Failed to verify that invalid or unmatched lead records are ignored with appropriate warnings shown.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/29c25de6-b3e7-4bd0-b586-ac32ad978189
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** Dashboard KPI Display Accuracy
- **Test Code:** [TC011_Dashboard_KPI_Display_Accuracy.py](./TC011_Dashboard_KPI_Display_Accuracy.py)
- **Test Error:** The dashboard correctly updates KPIs when filtering by brand, but fails to update KPIs when filtering by time period. The issue with the time period filter prevents full verification of KPI updates. Reporting this issue and stopping further testing.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/e45b5e20-9fd8-4180-9fe8-3e64cb4a7a55
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** Budget CRUD Operations with Validations
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/a8303311-7e3e-4853-981e-0711e3f46283
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013
- **Test Name:** Optimization History Tracking and Updates
- **Test Code:** [TC013_Optimization_History_Tracking_and_Updates.py](./TC013_Optimization_History_Tracking_and_Updates.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/a44c785f-95c8-420a-a813-87aa93a960c7
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014
- **Test Name:** Reports Filtering and Metric Aggregation
- **Test Code:** [TC014_Reports_Filtering_and_Metric_Aggregation.py](./TC014_Reports_Filtering_and_Metric_Aggregation.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/282c5427-b9da-4bb9-a074-e3dbce8278e9
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015
- **Test Name:** Report Import with Meta Ads CSV Valid Data
- **Test Code:** [TC015_Report_Import_with_Meta_Ads_CSV_Valid_Data.py](./TC015_Report_Import_with_Meta_Ads_CSV_Valid_Data.py)
- **Test Error:** Stopped testing due to inability to access Meta Ads CSV import functionality on the 'Anúncios' page. The import option is not visible or accessible after clicking 'Novo Anúncio'. No import modal or form appeared to allow uploading the CSV file. Please investigate and fix this issue to enable import testing.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/6ad8cf4c-423c-4f10-8646-6edc10e40c7d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016
- **Test Name:** Media File Upload and Management
- **Test Code:** [TC016_Media_File_Upload_and_Management.py](./TC016_Media_File_Upload_and_Management.py)
- **Test Error:** Testing stopped due to inability to open media upload interface. The 'Adicionar Mídia' button click fails with a DOM context error, preventing further upload tests. Please investigate this issue to enable media upload testing.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key. (at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=30a3d400:8294:14)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key. (at http://localhost:5173/node_modules/.vite/deps/@supabase_supabase-js.js?v=30a3d400:8294:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/46e858a5-c2a3-42b2-8da1-80bd8172a790
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017
- **Test Name:** API Uniform Supabase Error Handling
- **Test Code:** [TC017_API_Uniform_Supabase_Error_Handling.py](./TC017_API_Uniform_Supabase_Error_Handling.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/b453cbf9-e7b3-43a6-83a8-28c1ba388ec3
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018
- **Test Name:** Frontend Loading States and Error Messages
- **Test Code:** [TC018_Frontend_Loading_States_and_Error_Messages.py](./TC018_Frontend_Loading_States_and_Error_Messages.py)
- **Test Error:** Test stopped due to missing loading indicators during async operations on the dashboard page. The 'Atualizar' button click did not show any loading feedback, indicating a UI issue. Further testing is not meaningful until this is resolved.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/574e2c8b-9cc0-461b-b483-7997781fbb97
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019
- **Test Name:** Responsive UI and Sidebar Collapse Persistence
- **Test Code:** [TC019_Responsive_UI_and_Sidebar_Collapse_Persistence.py](./TC019_Responsive_UI_and_Sidebar_Collapse_Persistence.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/6a670be6-bb18-406e-8c94-4751804cfaf0
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020
- **Test Name:** Atomic CRUD Operations with User Notifications
- **Test Code:** [TC020_Atomic_CRUD_Operations_with_User_Notifications.py](./TC020_Atomic_CRUD_Operations_with_User_Notifications.py)
- **Test Error:** Stopped testing due to critical issue: unable to perform Update operation in Campaigns module because the page navigates away unexpectedly. Create and Read operations were partially verified but no success toast was detected for Create. Further CRUD testing halted until issue is resolved.
Browser Console Logs:
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] [RBAC] Redirecionando de / para /onboard - cargo 'Marketing' não tem acesso. (at http://localhost:5173/src/layouts/MainLayout.jsx?t=1765489097354:92:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
[WARNING] ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=30a3d400:4412:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e10faaf8-26a4-408d-ad46-f9ced16d9557/953c641d-7859-4c91-9915-01bb957884fc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **30.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---