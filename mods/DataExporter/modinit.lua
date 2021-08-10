MountModData( "DataExporter" )
local function OnLoad()
	require("DataExporter:file/codes")
end
return {
	version = "0.1.0",
	alias = "DataExporter",
	OnPreLoad = OnPreLoad,
	OnLoad = OnLoad,
	OnNewGame = OnNewGame,
	OnGameStart = OnGameStart,
	title = "DataExporter",
	description = "Hijack the Daily Challenge button to instead export some json files",
	previewImagePath = "preview.png",
}