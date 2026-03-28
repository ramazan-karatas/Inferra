// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/AgentMarketplace.sol";
import "./utils/Test.sol";

contract AgentMarketplaceTest is Test {
    AgentNFT private agentNFT;
    AgentMarketplace private marketplace;

    address private constant SELLER = address(0xA11CE);
    address private constant BUYER = address(0xB0B);
    address private constant USER = address(0xCAFE);
    address private constant FINALIZER = address(0xF1A1);

    uint256 private constant SALE_PRICE = 1 ether;
    uint256 private constant USAGE_PRICE = 0.1 ether;

    function setUp() public {
        agentNFT = new AgentNFT("Monad Agents", "AGENT");
        marketplace = new AgentMarketplace(address(agentNFT));
        agentNFT.setAuthorizedUsageRecorder(address(marketplace));
        marketplace.setFinalizer(FINALIZER);

        vm.deal(SELLER, 10 ether);
        vm.deal(BUYER, 10 ether);
        vm.deal(USER, 10 ether);
    }

    function testOnlyOwnerCanList() public {
        vm.prank(SELLER);
        uint256 tokenId = agentNFT.mintAgent("ipfs://agent-1", "research-agent", "1.0.0", SELLER);

        vm.prank(BUYER);
        vm.expectRevert(AgentMarketplace.NotAuthorized.selector);
        marketplace.listAgent(tokenId, SALE_PRICE);
    }

    function testBuyTransfersOwnershipCorrectly() public {
        vm.startPrank(SELLER);
        uint256 tokenId = agentNFT.mintAgent("ipfs://agent-1", "research-agent", "1.0.0", SELLER);
        agentNFT.approve(address(marketplace), tokenId);
        marketplace.listAgent(tokenId, SALE_PRICE);
        vm.stopPrank();

        vm.prank(BUYER);
        marketplace.buyAgent{value: SALE_PRICE}(tokenId);

        assertEq(agentNFT.ownerOf(tokenId), BUYER);
        assertEq(marketplace.isListingValid(tokenId), false);
    }

    function testOwnerCanSetUsagePriceAndUserCanBuyEntitlement() public {
        vm.prank(SELLER);
        uint256 tokenId = agentNFT.mintAgent("ipfs://agent-1", "research-agent", "1.0.0", SELLER);

        vm.prank(SELLER);
        marketplace.setUsagePrice(tokenId, USAGE_PRICE);

        vm.prank(USER);
        uint256 entitlementId = marketplace.payForUsage{value: USAGE_PRICE}(tokenId);

        assertEq(
            marketplace.hasValidEntitlement(entitlementId, USER, tokenId),
            true
        );
    }

    function testOnlyAuthorizedFinalizerCanFinalizeAndConsumeEntitlement() public {
        vm.prank(SELLER);
        uint256 tokenId = agentNFT.mintAgent("ipfs://agent-1", "research-agent", "1.0.0", SELLER);

        vm.prank(SELLER);
        marketplace.setUsagePrice(tokenId, USAGE_PRICE);

        vm.prank(USER);
        uint256 entitlementId = marketplace.payForUsage{value: USAGE_PRICE}(tokenId);

        vm.prank(USER);
        vm.expectRevert(AgentMarketplace.NotAuthorized.selector);
        marketplace.finalizeUsage(entitlementId, true);

        vm.prank(FINALIZER);
        marketplace.finalizeUsage(entitlementId, true);

        assertEq(marketplace.hasValidEntitlement(entitlementId, USER, tokenId), false);

        AgentNFT.AgentInfo memory info = agentNFT.getAgentInfo(tokenId);
        assertEq(info.usageCount, 1);
        assertEq(info.successCount, 1);
        assertEq(info.failureCount, 0);
    }

    function testCountersUpdateCorrectlyForFailure() public {
        vm.prank(SELLER);
        uint256 tokenId = agentNFT.mintAgent("ipfs://agent-1", "research-agent", "1.0.0", SELLER);

        vm.prank(SELLER);
        marketplace.setUsagePrice(tokenId, USAGE_PRICE);

        vm.prank(USER);
        uint256 entitlementId = marketplace.payForUsage{value: USAGE_PRICE}(tokenId);

        vm.prank(FINALIZER);
        marketplace.finalizeUsage(entitlementId, false);

        AgentNFT.AgentInfo memory info = agentNFT.getAgentInfo(tokenId);
        assertEq(info.usageCount, 1);
        assertEq(info.successCount, 0);
        assertEq(info.failureCount, 1);
    }

    function testPurchaseFailsIfListingSellerNoLongerOwnsToken() public {
        vm.startPrank(SELLER);
        uint256 tokenId = agentNFT.mintAgent("ipfs://agent-1", "research-agent", "1.0.0", SELLER);
        agentNFT.approve(address(marketplace), tokenId);
        marketplace.listAgent(tokenId, SALE_PRICE);
        agentNFT.transferFrom(SELLER, USER, tokenId);
        vm.stopPrank();

        vm.prank(BUYER);
        vm.expectRevert(AgentMarketplace.ListingOwnershipMismatch.selector);
        marketplace.buyAgent{value: SALE_PRICE}(tokenId);
    }

    function testListingBecomesInvalidAfterOwnershipTransfer() public {
        vm.startPrank(SELLER);
        uint256 tokenId = agentNFT.mintAgent("ipfs://agent-1", "research-agent", "1.0.0", SELLER);
        agentNFT.approve(address(marketplace), tokenId);
        marketplace.listAgent(tokenId, SALE_PRICE);
        agentNFT.transferFrom(SELLER, USER, tokenId);
        vm.stopPrank();

        assertEq(marketplace.isListingValid(tokenId), false);
    }
}
