function Screen.MainMenu:OnPressDaily()
	self.cards = self.RefreshCardsSelection()
	self.currentIndex = 0
	self:DoPeriodicTask( "perform_my_export", 0.5, 0.5, function()
		self:PerformNextExport()
	end )
end

function Screen.MainMenu:RefreshCardsSelection()
    local battle_defs = require "battle/battle_defs"
    local battle_card_options = {}
    local battle_cards = BattleCardCollection():Filter( function( card_def )
        return not CheckAnyBits( card_def.flags, battle_defs.CARD_FLAGS.SPECIAL | battle_defs.CARD_FLAGS.NPC )
    end )
    for k, card_def in ipairs( battle_cards.items ) do
        table.insert( battle_card_options, { txt = "" .. LOC( card_def:GetLocNameKey() ) .. " <b>[" .. card_def.id .. "]</>", card_def = card_def })
    end
    table.sort( battle_card_options, function( a, b ) return a.txt < b.txt end )
    --self.battle_card_options = battle_card_options

    local negotiation_defs = require "negotiation/negotiation_defs"
    local negotiation_card_options = {}
    local negotiation_cards = NegotiationCardCollection()
    for k, card_def in ipairs( negotiation_cards.items ) do
		if not CheckAnyBits( card_def.flags, negotiation_defs.CARD_FLAGS.SPECIAL | negotiation_defs.CARD_FLAGS.OPPONENT ) then
			table.insert( negotiation_card_options, { txt = LOC( card_def:GetLocNameKey() ) .. " [" .. card_def.id .. "]", card_def = card_def })
		end
    end
    table.sort( negotiation_card_options, function( a, b ) return a.txt < b.txt end )
    --self.negotiation_card_options = negotiation_card_options
	return negotiation_card_options
end

function Screen.MainMenu:PerformNextExport()
	self.currentIndex = self.currentIndex + 1
	if (self.currentIndex == 100) then
		TheGame:FE():PushScreen( Screen.InfoPopup( "AUR", "done" ) )
	end
	if (self.currentIndex >= 100) then
		return
	end
	local card = self.cards[self.currentIndex]
	self:SetCard(card)
	self:StartCoroutine(self.ExportImageCoro, self)
end

function Screen.MainMenu:SetCard( option )
    -- Remove existing card
    if self.card_widget then
        self.card_widget:Remove()
        self.card_widget = nil
    end

    if option.card_def._classname == "BattleCardDef" then
        -- Battle Card!
        self.card = Battle.Card( option.card_def.id )
        self.card_widget = self:AddChild( Widget.BattleCard() )
            :RefreshCard( self.card )
    else
        -- Negotiation Card!
        self.card = Negotiation.Card( option.card_def.id )
        self.card_widget = self:AddChild( Widget.NegotiationCard() )
            :RefreshCard( self.card )
    end

end

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
    engine.inst:SaveTextureToPNG( capture:GetTexture(), "../image_exports/" .. self.card_widget.card.id .. ".png" );

    -- Make sure to call collect garbage a lot so that capture images get their resources freed:
    collectgarbage()
	

end