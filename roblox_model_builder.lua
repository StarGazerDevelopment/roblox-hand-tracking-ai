local ServerStorage = game:GetService("ServerStorage")
local Workspace = game:GetService("Workspace")
local folder = Workspace:FindFirstChild("Hand") or Instance.new("Folder", Workspace)
folder.Name = "Hand"
local model = Instance.new("Model")
model.Name = "Test-hand"
model.Parent = folder
local function createPart(name, size, color, material)
    local p = Instance.new("Part")
    p.Name = name
    p.Size = size
    p.Color = color
    p.Material = material
    p.Anchored = false
    p.CanCollide = false
    p.Parent = model
    return p
end
local palm = createPart("Palm", Vector3.new(2.5, 0.5, 2), Color3.fromRGB(210, 180, 140), Enum.Material.SmoothPlastic)
model.PrimaryPart = palm
palm.CFrame = CFrame.new(0, 5, 0)
local textures = {
    "rbxassetid://9060000660",
    "rbxassetid://9060000661",
    "rbxassetid://9060000662",
    "rbxassetid://9060000663",
    "rbxassetid://9060000664"
}
local function applyTexture(part, id)
    local tex = Instance.new("Texture")
    tex.Texture = id
    tex.Face = Enum.NormalId.Top
    tex.StudsPerTileU = 4
    tex.StudsPerTileV = 4
    tex.Parent = part
end
applyTexture(palm, textures[1])
local function createFinger(name, baseOffset, color, texId)
    local base = createPart(name.."_Base", Vector3.new(0.5, 0.5, 0.6), color, Enum.Material.Neon)
    local mid = createPart(name.."_Mid", Vector3.new(0.45, 0.45, 0.6), color, Enum.Material.SmoothPlastic)
    local tip = createPart(name.."_Tip", Vector3.new(0.4, 0.4, 0.6), color, Enum.Material.SmoothPlastic)
    base.CFrame = palm.CFrame * CFrame.new(baseOffset.X, 0.3, baseOffset.Z)
    mid.CFrame = base.CFrame * CFrame.new(0, 0, -0.7)
    tip.CFrame = mid.CFrame * CFrame.new(0, 0, -0.7)
    applyTexture(base, texId)
    return base, mid, tip
end
local colors = {
    Color3.fromRGB(255, 99, 71),
    Color3.fromRGB(135, 206, 250),
    Color3.fromRGB(60, 179, 113),
    Color3.fromRGB(238, 130, 238),
    Color3.fromRGB(255, 215, 0)
}
local offsets = {
    Vector3.new(-0.8, 0, 0.9),
    Vector3.new(-0.4, 0, 1.0),
    Vector3.new(0.0, 0, 1.05),
    Vector3.new(0.4, 0, 1.0),
    Vector3.new(0.9, 0, 0.8)
}
local fingers = {}
for i=1,5 do
    local base, mid, tip = createFinger("Finger"..i, offsets[i], colors[i], textures[i])
    table.insert(fingers, {base=base, mid=mid, tip=tip})
end
local function weld(a, b, name)
    local m = Instance.new("Motor6D")
    m.Name = name
    m.Part0 = a
    m.Part1 = b
    m.C0 = a.CFrame:ToObjectSpace(a.CFrame)
    m.C1 = a.CFrame:ToObjectSpace(b.CFrame)
    m.Parent = a
    return m
end
for i, f in ipairs(fingers) do
    weld(palm, f.base, "PalmToFinger"..i)
    weld(f.base, f.mid, "Finger"..i.."BaseToMid")
    weld(f.mid, f.tip, "Finger"..i.."MidToTip")
end
local hum = Instance.new("Humanoid")
hum.Parent = model
