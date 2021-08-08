MountModData( "CardExporter" )
local function OnLoad()
	require("CardExporter:file/codes")
end
return {
	version = "0.1.0",
	alias = "CardExporter",
	OnPreLoad = OnPreLoad,
	OnLoad = OnLoad,
	OnNewGame = OnNewGame,
	OnGameStart = OnGameStart,
	title = "CardExporter",
	description = "Hijack the Daily Challenge button to instead export all cards",
	previewImagePath = "preview.png",
}