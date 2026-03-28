// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./AgentNFT.sol";

contract AgentMarketplace {
    error NotAuthorized();
    error InvalidPrice();
    error InvalidAddress();
    error MarketplaceNotApproved();
    error ListingNotActive();
    error ListingOwnershipMismatch();
    error IncorrectPayment();
    error EntitlementNotFound();
    error EntitlementAlreadyConsumed();
    error AgentInactive();

    event AgentListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);
    event AgentPurchased(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event UsagePriceSet(uint256 indexed tokenId, address indexed owner, uint256 price);
    event UsageEntitlementPurchased(
        uint256 indexed entitlementId,
        uint256 indexed tokenId,
        address indexed buyer,
        address owner,
        uint256 price
    );
    event UsageFinalized(uint256 indexed entitlementId, uint256 indexed tokenId, address indexed buyer, bool success);
    event FinalizerUpdated(address indexed finalizer);

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    struct Entitlement {
        address buyer;
        uint256 tokenId;
        uint256 paidAmount;
        bool consumed;
        uint256 createdAt;
    }

    AgentNFT public immutable agentNFT;
    address public owner;
    address public finalizer;
    uint256 public nextEntitlementId = 1;

    mapping(uint256 tokenId => Listing) public listings;
    mapping(uint256 tokenId => uint256) public usagePrices;
    mapping(uint256 entitlementId => Entitlement) public entitlements;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlyFinalizer() {
        if (msg.sender != finalizer) revert NotAuthorized();
        _;
    }

    constructor(address agentNFTAddress) {
        if (agentNFTAddress == address(0)) revert InvalidAddress();
        agentNFT = AgentNFT(agentNFTAddress);
        owner = msg.sender;
    }

    function listAgent(uint256 tokenId, uint256 price) external {
        if (price == 0) revert InvalidPrice();
        if (agentNFT.ownerOf(tokenId) != msg.sender) revert NotAuthorized();
        if (
            agentNFT.getApproved(tokenId) != address(this) &&
            !agentNFT.isApprovedForAll(msg.sender, address(this))
        ) revert MarketplaceNotApproved();

        listings[tokenId] = Listing({seller: msg.sender, price: price, active: true});
        emit AgentListed(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        if (!listing.active) revert ListingNotActive();

        address currentOwner = agentNFT.ownerOf(tokenId);
        if (msg.sender != currentOwner && msg.sender != listing.seller) revert NotAuthorized();

        delete listings[tokenId];
        emit ListingCancelled(tokenId);
    }

    function buyAgent(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        if (!listing.active) revert ListingNotActive();
        if (msg.value != listing.price) revert IncorrectPayment();
        if (agentNFT.ownerOf(tokenId) != listing.seller) revert ListingOwnershipMismatch();

        delete listings[tokenId];
        _forwardValue(listing.seller, msg.value);
        agentNFT.transferFrom(listing.seller, msg.sender, tokenId);

        emit ListingCancelled(tokenId);
        emit AgentPurchased(tokenId, listing.seller, msg.sender, listing.price);
    }

    function setUsagePrice(uint256 tokenId, uint256 price) external {
        if (price == 0) revert InvalidPrice();
        if (agentNFT.ownerOf(tokenId) != msg.sender) revert NotAuthorized();

        usagePrices[tokenId] = price;
        emit UsagePriceSet(tokenId, msg.sender, price);
    }

    function payForUsage(uint256 tokenId) external payable returns (uint256 entitlementId) {
        AgentNFT.AgentInfo memory info = agentNFT.getAgentInfo(tokenId);
        if (!info.isActive) revert AgentInactive();

        uint256 usagePrice = usagePrices[tokenId];
        if (usagePrice == 0) revert InvalidPrice();
        if (msg.value != usagePrice) revert IncorrectPayment();

        address currentOwner = agentNFT.ownerOf(tokenId);
        entitlementId = nextEntitlementId++;
        entitlements[entitlementId] = Entitlement({
            buyer: msg.sender,
            tokenId: tokenId,
            paidAmount: msg.value,
            consumed: false,
            createdAt: block.timestamp
        });

        _forwardValue(currentOwner, msg.value);
        emit UsageEntitlementPurchased(entitlementId, tokenId, msg.sender, currentOwner, msg.value);
    }

    function hasValidEntitlement(
        uint256 entitlementId,
        address buyer,
        uint256 tokenId
    ) external view returns (bool) {
        Entitlement memory entitlement = entitlements[entitlementId];
        return
            entitlement.buyer == buyer &&
            entitlement.tokenId == tokenId &&
            entitlement.buyer != address(0) &&
            !entitlement.consumed;
    }

    function isListingValid(uint256 tokenId) external view returns (bool) {
        Listing memory listing = listings[tokenId];
        return listing.active && listing.seller != address(0) && agentNFT.ownerOf(tokenId) == listing.seller;
    }

    function finalizeUsage(uint256 entitlementId, bool success) external onlyFinalizer {
        Entitlement storage entitlement = entitlements[entitlementId];
        if (entitlement.buyer == address(0)) revert EntitlementNotFound();
        if (entitlement.consumed) revert EntitlementAlreadyConsumed();

        entitlement.consumed = true;
        agentNFT.recordUsageResult(entitlement.tokenId, success);

        emit UsageFinalized(entitlementId, entitlement.tokenId, entitlement.buyer, success);
    }

    function setFinalizer(address newFinalizer) external onlyOwner {
        if (newFinalizer == address(0)) revert InvalidAddress();
        finalizer = newFinalizer;
        emit FinalizerUpdated(newFinalizer);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        owner = newOwner;
    }

    function _forwardValue(address recipient, uint256 amount) private {
        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) revert IncorrectPayment();
    }
}
