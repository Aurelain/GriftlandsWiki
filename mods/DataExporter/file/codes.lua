local json = require 'dkjson'

------------------------------------------------------------------------------------------------------------------------
-- Overrides the Daily button click
function Screen.MainMenu:OnPressDaily()

    -- Export cards
	local cards = self:CollectCards()
    self:WriteJson("cards", cards)

    -- Export characters
	local characters = self:CollectCharacters()
    self:WriteJson("characters", characters)

    -- Export grafts
	local grafts = self:CollectGrafts()
    self:WriteJson("grafts", grafts)

    TheGame:FE():PushScreen( Screen.InfoPopup( "DataExporter", "done" ) )
end

------------------------------------------------------------------------------------------------------------------------
-- Inspired by `data_scripts/scripts/data_util.lua @ DataUtil.AllCards`
function Screen.MainMenu:CollectCards()
    local cards = {}
    local count = 0
    do
        local negotiation_defs = require "negotiation/negotiation_defs"
        local CARD_FLAGS = negotiation_defs.CARD_FLAGS
        for id, def in pairs( Content.GetAllNegotiationCards() ) do
            if not CheckAnyBits( def.flags, CARD_FLAGS.OPPONENT | CARD_FLAGS.BYSTANDER ) then
                local card = self:CopySimpleValues(def)
                local id = def.id
                assert( not CheckBits( def.flags, CARD_FLAGS.BYSTANDER ))
                local instance = Negotiation.Card( id )
                local desc = instance:GetDesc()
                card.desc = desc and SanitizeString( desc )
                card.card_type = GetCardType( instance )
                card.deck_type = "negotiation"
                cards[def.id] = card
                count = count + 1
            end
        end
    end

    do
        local battle_defs = require "battle/battle_defs"
        local CARD_FLAGS = battle_defs.CARD_FLAGS
        for i, def in ipairs( Content.GetAllBattleCards() ) do
            if not CheckAnyBits( def.flags, CARD_FLAGS.SPECIAL | CARD_FLAGS.NPC ) then
                local card = self:CopySimpleValues(def)
                local instance = Battle.Card( def.id )
                local desc = instance:GetDesc()
                card.desc = desc and SanitizeString( desc )
                card.card_type = GetCardType( instance )
                card.deck_type = "battle"
                cards[def.id] = card
                count = count + 1
            end
        end
    end
    TheGame:FE():PushScreen( Screen.InfoPopup( "cards", count) )
	return cards
end

------------------------------------------------------------------------------------------------------------------------
-- Inspired by `data_scripts/scripts/data_util.lua @ DataUtil.AgentDefs`
function Screen.MainMenu:CollectCharacters()
    local get_avg_health = function(def)
        local max_health = def.fight_data.MAX_HEALTH and def.fight_data.MAX_HEALTH or 0
        return type(max_health) == "table" and math.round((max_health[1] + max_health[2])/2) or def.fight_data.MAX_HEALTH
    end

    local get_min_health = function(def)
        local max_health = def.fight_data.MAX_HEALTH and def.fight_data.MAX_HEALTH or 0
        local num = type(max_health) == "table" and max_health[1] or def.fight_data.MAX_HEALTH
        return num
    end

    local get_max_health = function(def)
        local max_health = def.fight_data.MAX_HEALTH and def.fight_data.MAX_HEALTH or 0
        local num = type(max_health) == "table" and max_health[2] or def.fight_data.MAX_HEALTH
        return num
    end

    local characters = {}
    local count = 0
    do
        for i, def in pairs( Content.GetAllCharacterDefs() ) do
--             if not (def.faction_id == "PLAYER" or def.faction_id == "NEUTRAL" or def.base_def == "BASE") then
                local character = self:CopySimpleValues(def)
                character.computed_avg_health = get_avg_health(def)
                character.computed_min_health = get_min_health(def)
                character.computed_max_health = get_max_health(def)
                characters[def.id] = character
                count = count + 1
--             end
        end
    end
    TheGame:FE():PushScreen( Screen.InfoPopup( "characters", count) )
    return characters
end

------------------------------------------------------------------------------------------------------------------------
-- Inspired by `data_scripts/scripts/data_util.lua @ DataUtil.AllGrafts`
function Screen.MainMenu:CollectGrafts()
    local grafts = {}
    local count = 0
    do
        for i, def in ipairs( Content.GetAllGrafts() ) do
            local graft = self:CopySimpleValues(def)
            local id = def.id
            local instance = GraftInstance( id )
            local desc = instance:GetDesc()
            graft.desc = desc and SanitizeString( desc )
            local graft_type = instance:GetType()
            if graft_type == GRAFT_TYPE.SOCIAL then
                graft.graft_type = def.is_good and "BOON" or "BANE"
            end
            grafts[id] = graft
            count = count + 1
        end
    end
    TheGame:FE():PushScreen( Screen.InfoPopup( "grafts", count) )
    return grafts
end

------------------------------------------------------------------------------------------------------------------------
function Screen.MainMenu:CopySimpleValues(object)
	local bag = {}
    for prop, value in pairs(object) do
        if type(value) == "string" or type(value) == "boolean" or type(value) == "number" then
            bag[prop] = value
        end
    end
    return bag
end

------------------------------------------------------------------------------------------------------------------------
function Screen.MainMenu:WriteJson(name, data)
	local targetFile = io.open( "DataExporter:output/"..name..".json", "w" )
	io.output(targetFile)
    local targetJson = json.encode(data, {exception = function() return '"native"' end, indent = true})
	io.write(targetJson)
	io.close(targetFile)
end