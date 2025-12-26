import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Input valid credentials and log in to access the main UI for responsive and sidebar tests.
        frame = context.pages[-1]
        # Input email for login
        elem = frame.locator('xpath=html/body/div/div/div/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('testuser@example.com')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div/div/div/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('TestPassword123')
        

        frame = context.pages[-1]
        # Click Entrar button to log in
        elem = frame.locator('xpath=html/body/div/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Resize browser window to tablet width and verify UI layout adapts and remains usable.
        await page.mouse.wheel(0, await page.evaluate('() => window.innerHeight'))
        

        frame = context.pages[-1]
        # Click the sidebar toggle button to collapse the sidebar
        elem = frame.locator('xpath=html/body/div/div/nav/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Reload the page to verify sidebar collapse state persistence.
        await page.goto('http://localhost:5173/onboard', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Resize browser window to tablet width and verify UI layout adapts and remains usable.
        await page.goto('http://localhost:5173/onboard', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Resize browser window to tablet width and verify UI layout adapts and remains usable.
        await page.goto('http://localhost:5173/onboard', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Resize browser window to tablet width and verify UI layout adapts and remains usable.
        await page.mouse.wheel(0, await page.evaluate('() => window.innerHeight'))
        

        await page.goto('http://localhost:5173/onboard', timeout=10000)
        await asyncio.sleep(3)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Onboard').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Orçamento').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Público-Alvo').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Otimizações').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Leads').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Produtos').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Mídias').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Anúncios').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Configurações').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=testuser@example.com').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Online').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Este Mês').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Últimos 7 dias').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Últimos 30 dias').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Mês Passado').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Este Ano').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Todas as Marcas').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Kia').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Suzuki').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Haojue').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Zontes').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=R$ 1.250,50').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=15').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=1.25%').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=R$ 3,45').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Ver Relatório').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Troca de criativo: Zontes E350').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Troca de criativo: Haojue Master Ride').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Troca de criativo: Zontes Tactic').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Troca de criativo: Suzuki V-strom 650').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Troca de criativo: Kia Stonic').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    