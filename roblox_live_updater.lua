local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local URL = "https://stargazerdevelopment.github.io/roblox-hand-tracking-ai/landmarks.json"
local model = Workspace:WaitForChild("Hand"):WaitForChild("Test-hand")
local palm = model:WaitForChild("Palm")
local map = {
    "Finger1_Base","Finger1_Mid","Finger1_Tip",
    "Finger2_Base","Finger2_Mid","Finger2_Tip",
    "Finger3_Base","Finger3_Mid","Finger3_Tip",
    "Finger4_Base","Finger4_Mid","Finger4_Tip",
    "Finger5_Base","Finger5_Mid","Finger5_Tip"
}
local function getPart(name)
    return model:FindFirstChild(name)
end
local function fetch()
    local ok, res = pcall(function()
        return HttpService:GetAsync(URL, true)
    end)
    if not ok then return nil end
    local ok2, json = pcall(function()
        return HttpService:JSONDecode(res)
    end)
    if not ok2 then return nil end
    return json
end
local function apply(hand)
    if not hand or #hand < 21 then return end
    local ox = palm.Position.X
    local oy = palm.Position.Y
    local oz = palm.Position.Z
    local scale = 12
    for i, name in ipairs(map) do
        local part = getPart(name)
        if part then
            local idx = math.clamp(i+4, 1, 21)
            local lm = hand[idx]
            local x = ox + (lm.x * scale)
            local y = oy + (lm.y * -scale)
            local z = oz + (lm.z * scale)
            part.Anchored = true
            part.CFrame = CFrame.new(x, y, z)
        end
    end
    palm.Anchored = true
end
local last = nil
RunService.Heartbeat:Connect(function()
    local data = fetch()
    local hand = nil
    if data and data.hands and #data.hands > 0 then
        hand = data.hands[1]
        last = hand
    else
        hand = last
    end
    if hand then
        apply(hand)
    end
end)
