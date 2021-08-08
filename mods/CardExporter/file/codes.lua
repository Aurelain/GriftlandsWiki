local json = require 'dkjson'

------------------------------------------------------------------------------------------------------------------------
-- Overrides the Daily button click
function Screen.MainMenu:OnPressDaily()
	self.cards = self.CollectCards()

    --self:WriteJson()

	self.currentIndex = 0
	self.interval = self:DoPeriodicTask( "perform_next_export", nil, 0.5, function()
		self:PerformNextExport()
	end )

end

------------------------------------------------------------------------------------------------------------------------
function Screen.MainMenu:CollectCards()
    local cards = {}

    local battle_defs = require "battle/battle_defs"
    local battle_cards = BattleCardCollection()
    for k, card_def in ipairs( battle_cards.items ) do
        if not CheckAnyBits( card_def.flags, battle_defs.CARD_FLAGS.SPECIAL | battle_defs.CARD_FLAGS.NPC ) then
            table.insert(cards, card_def)
        end
    end

    local negotiation_defs = require "negotiation/negotiation_defs"
    local negotiation_cards = NegotiationCardCollection()
    for k, card_def in ipairs( negotiation_cards.items ) do
		if not CheckAnyBits( card_def.flags, negotiation_defs.CARD_FLAGS.SPECIAL | negotiation_defs.CARD_FLAGS.OPPONENT ) then
			table.insert(cards, card_def)
		end
    end

	return cards
end

------------------------------------------------------------------------------------------------------------------------
function Screen.MainMenu:WriteJson()
	local allFile = io.open( "CardExporter:output/_all.json", "w" )
	io.output(allFile)
    local allJson = json.encode(self.cards, {exception = function() return '"native"' end,indent = true})
	io.write(allJson)
	io.close(allFile)
end

------------------------------------------------------------------------------------------------------------------------
function Screen.MainMenu:PerformNextExport()
	self.currentIndex = self.currentIndex + 1
	local card = self.cards[self.currentIndex]
	if not card then
	    self.interval:Cancel()
	    TheGame:FE():PushScreen( Screen.InfoPopup( "CardExporter", "done" ) )
        return
	end
	self:SetCard(card)
	self:StartCoroutine(self.ExportImageCoro, self)
end

------------------------------------------------------------------------------------------------------------------------
function Screen.MainMenu:SetCard( card )
    -- Remove existing card
    if self.card_widget then
        self.card_widget:Remove()
        self.card_widget = nil
    end

    if card._classname == "BattleCardDef" then
        self.card = Battle.Card( card.id )
        self.card_widget = self:AddChild( Widget.BattleCard() )
    else -- Negotiation Card!
        self.card = Negotiation.Card( card.id )
        self.card_widget = self:AddChild( Widget.NegotiationCard() )
    end

    if (card.base_id) then
        self.card_widget:RefreshCard( self.card, nil, Widget.CardWidget.STYLE.UPGRADE )
    else
        self.card_widget:RefreshCard( self.card )
    end
end

------------------------------------------------------------------------------------------------------------------------
function Screen.MainMenu:ExportImageCoro()
    local scale = 1 -- was 3
    local CARD_W = 370 * scale
    local CARD_H = 542 * scale
    local PADDING = 0 * scale -- was 20

    local render_w = CARD_W+PADDING
    local render_h = CARD_H+PADDING

    local scene = engine.rendering.Scene()
    local capture = Widget.CaptureImage(scene)
        :SetSize( render_w, render_h )
    local anim_container = Widget()
    self.card_widget:Reparent( anim_container )
    self.card_widget:SetPos( 0, 0 )
        :SetOutline( nil )
    local sx, sy = self.card_widget:GetScale()
    self.card_widget:SetScale( 2 * scale, 2 * scale )
    self.card_widget.shadow:Hide()
    local root = engine.rendering.SceneGraphNode()
    root:SetScene(scene)
    root:AddChild(anim_container.node)

    self:Delay( 0.1 )

    while not engine.inst:IsAsyncLoadingComplete() do
        coroutine.yield()
    end

    capture:RenderToScene( anim_container, -render_w, -render_h, render_w, render_h )
    engine.inst:SaveTextureToPNG( capture:GetTexture(), "CardExporter:output/" .. self.card_widget.card.id .. ".png" );

    -- Make sure to call collect garbage a lot so that capture images get their resources freed:
    collectgarbage()
end