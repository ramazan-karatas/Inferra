// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/AgentNFT.sol";
import "./utils/Test.sol";

contract AgentNFTTest is Test {
    AgentNFT private agentNFT;

    address private constant CREATOR = address(0xA11CE);
    address private constant OTHER = address(0xB0B);
    address private constant MAINTAINER = address(0xCAFE);
    address private constant RECORDER = address(0xF1A1);

    function setUp() public {
        agentNFT = new AgentNFT("Monad Agents", "AGENT");
    }

    function testMintStoresCorrectMetadataAndCreator() public {
        vm.prank(CREATOR);
        uint256 tokenId = agentNFT.mintAgent("ipfs://agent-1", "research-agent", "1.0.0", MAINTAINER);

        AgentNFT.AgentInfo memory info = agentNFT.getAgentInfo(tokenId);
        assertEq(tokenId, 1);
        assertEq(agentNFT.ownerOf(tokenId), CREATOR);
        assertEq(info.creator, CREATOR);
        assertEq(info.metadataURI, "ipfs://agent-1");
        assertEq(info.agentKey, "research-agent");
        assertEq(info.version, "1.0.0");
        assertEq(info.maintainer, MAINTAINER);
        assertEq(info.isActive, true);
    }

    function testOnlyOwnerCanUpdateAgentState() public {
        vm.prank(CREATOR);
        uint256 tokenId = agentNFT.mintAgent("ipfs://agent-1", "research-agent", "1.0.0", MAINTAINER);

        vm.prank(OTHER);
        vm.expectRevert(AgentNFT.NotAuthorized.selector);
        agentNFT.setAgentActiveStatus(tokenId, false);

        vm.prank(CREATOR);
        agentNFT.setAgentActiveStatus(tokenId, false);

        AgentNFT.AgentInfo memory info = agentNFT.getAgentInfo(tokenId);
        assertEq(info.isActive, false);
    }

    function testOnlyAuthorizedUsageRecorderCanUpdateCounters() public {
        vm.prank(CREATOR);
        uint256 tokenId = agentNFT.mintAgent("ipfs://agent-1", "research-agent", "1.0.0", MAINTAINER);

        agentNFT.setAuthorizedUsageRecorder(RECORDER);

        vm.prank(OTHER);
        vm.expectRevert(AgentNFT.NotAuthorized.selector);
        agentNFT.recordUsageResult(tokenId, true);

        vm.prank(RECORDER);
        agentNFT.recordUsageResult(tokenId, true);

        AgentNFT.AgentInfo memory info = agentNFT.getAgentInfo(tokenId);
        assertEq(info.usageCount, 1);
        assertEq(info.successCount, 1);
        assertEq(info.failureCount, 0);
    }
}
