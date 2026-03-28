// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface Vm {
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
    function deal(address who, uint256 newBalance) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
}

address constant HEVM_ADDRESS = address(uint160(uint256(keccak256("hevm cheat code"))));
Vm constant vm = Vm(HEVM_ADDRESS);

contract Test {
    error AssertionFailed();

    function assertEq(uint256 left, uint256 right) internal pure {
        if (left != right) revert AssertionFailed();
    }

    function assertEq(address left, address right) internal pure {
        if (left != right) revert AssertionFailed();
    }

    function assertEq(bool left, bool right) internal pure {
        if (left != right) revert AssertionFailed();
    }

    function assertEq(string memory left, string memory right) internal pure {
        if (keccak256(bytes(left)) != keccak256(bytes(right))) revert AssertionFailed();
    }
}
