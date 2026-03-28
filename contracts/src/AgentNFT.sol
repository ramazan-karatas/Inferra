// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract AgentNFT {
    error NotAuthorized();
    error TokenDoesNotExist();
    error InvalidAddress();

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event AgentMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed owner,
        string metadataURI,
        string agentKey
    );
    event AgentStatusUpdated(uint256 indexed tokenId, bool isActive);
    event AgentVersionUpdated(uint256 indexed tokenId, string version);
    event AgentMaintainerUpdated(uint256 indexed tokenId, address indexed maintainer);
    event AuthorizedUsageRecorderUpdated(address indexed recorder);
    event AgentUsageRecorded(
        uint256 indexed tokenId,
        bool success,
        uint256 usageCount,
        uint256 successCount,
        uint256 failureCount
    );

    struct AgentInfo {
        address creator;
        string metadataURI;
        string agentKey;
        string version;
        address maintainer;
        uint256 usageCount;
        uint256 successCount;
        uint256 failureCount;
        bool isActive;
    }

    string public name;
    string public symbol;
    address public owner;
    address public authorizedUsageRecorder;
    uint256 public nextTokenId = 1;

    mapping(uint256 tokenId => AgentInfo) private _agentInfo;
    mapping(uint256 tokenId => address) private _owners;
    mapping(address ownerAddress => uint256) private _balances;
    mapping(uint256 tokenId => address) private _tokenApprovals;
    mapping(address ownerAddress => mapping(address operator => bool)) private _operatorApprovals;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlyTokenOwner(uint256 tokenId) {
        if (ownerOf(tokenId) != msg.sender) revert NotAuthorized();
        _;
    }

    modifier onlyAuthorizedUsageRecorder() {
        if (msg.sender != authorizedUsageRecorder) revert NotAuthorized();
        _;
    }

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
        owner = msg.sender;
    }

    function balanceOf(address ownerAddress) external view returns (uint256) {
        if (ownerAddress == address(0)) revert InvalidAddress();
        return _balances[ownerAddress];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert TokenDoesNotExist();
        return tokenOwner;
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        _requireOwned(tokenId);
        return _tokenApprovals[tokenId];
    }

    function isApprovedForAll(address ownerAddress, address operator) external view returns (bool) {
        return _operatorApprovals[ownerAddress][operator];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _agentInfo[tokenId].metadataURI;
    }

    function getAgentInfo(uint256 tokenId) external view returns (AgentInfo memory) {
        _requireOwned(tokenId);
        return _agentInfo[tokenId];
    }

    function mintAgent(
        string calldata metadataURI,
        string calldata agentKey,
        string calldata version,
        address maintainer
    ) external returns (uint256 tokenId) {
        if (maintainer == address(0)) revert InvalidAddress();

        tokenId = nextTokenId++;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender] += 1;

        _agentInfo[tokenId] = AgentInfo({
            creator: msg.sender,
            metadataURI: metadataURI,
            agentKey: agentKey,
            version: version,
            maintainer: maintainer,
            usageCount: 0,
            successCount: 0,
            failureCount: 0,
            isActive: true
        });

        emit Transfer(address(0), msg.sender, tokenId);
        emit AgentMinted(tokenId, msg.sender, msg.sender, metadataURI, agentKey);
    }

    function approve(address to, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (msg.sender != tokenOwner && !_operatorApprovals[tokenOwner][msg.sender]) revert NotAuthorized();

        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (to == address(0)) revert InvalidAddress();

        address tokenOwner = ownerOf(tokenId);
        if (tokenOwner != from) revert NotAuthorized();
        if (!_isApprovedOrOwner(msg.sender, tokenId)) revert NotAuthorized();

        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Approval(from, address(0), tokenId);
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    function setAgentActiveStatus(uint256 tokenId, bool isActive) external onlyTokenOwner(tokenId) {
        _agentInfo[tokenId].isActive = isActive;
        emit AgentStatusUpdated(tokenId, isActive);
    }

    function updateVersion(uint256 tokenId, string calldata version) external onlyTokenOwner(tokenId) {
        _agentInfo[tokenId].version = version;
        emit AgentVersionUpdated(tokenId, version);
    }

    function updateMaintainer(uint256 tokenId, address maintainer) external onlyTokenOwner(tokenId) {
        if (maintainer == address(0)) revert InvalidAddress();
        _agentInfo[tokenId].maintainer = maintainer;
        emit AgentMaintainerUpdated(tokenId, maintainer);
    }

    function setAuthorizedUsageRecorder(address recorder) external onlyOwner {
        authorizedUsageRecorder = recorder;
        emit AuthorizedUsageRecorderUpdated(recorder);
    }

    function recordUsageResult(uint256 tokenId, bool success) external onlyAuthorizedUsageRecorder {
        AgentInfo storage info = _agentInfo[tokenId];
        _requireOwned(tokenId);

        unchecked {
            info.usageCount += 1;
        }

        if (success) {
            unchecked {
                info.successCount += 1;
            }
        } else {
            unchecked {
                info.failureCount += 1;
            }
        }

        emit AgentUsageRecorded(tokenId, success, info.usageCount, info.successCount, info.failureCount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        owner = newOwner;
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) private view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return spender == tokenOwner || _tokenApprovals[tokenId] == spender || _operatorApprovals[tokenOwner][spender];
    }

    function _requireOwned(uint256 tokenId) private view {
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist();
    }
}
