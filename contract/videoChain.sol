// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

}


contract VideoChain {

    using SafeMath for uint;
    uint internal videoCount = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    struct Video {
        address payable owner;
        string title;
        string url;
        string poster;
        string description;
        uint supporters;
        uint raised;
    }

    mapping (uint => Video) internal videos;

    // owner modifier
    modifier onlyOwner(uint _index) {
        require(videos[_index].owner == payable(msg.sender), 'only owner can modify parameters');
        _;
    }

     // admin modifier
    modifier notOwner(uint _index) {
        require(videos[_index].owner == payable(msg.sender), 'you can not modify parameters');
        _;
    }


    // create a video
    function uploadVideo(
        string memory _title,
        string memory _url,
        string memory _poster,
        string memory _description
    ) public {
        require(bytes(_title).length > 0, "Enter a valid title");
        require(bytes(_url).length > 0, "Enter a valid url");
        require(bytes(_poster).length > 0, "Enter a valid poster");
        require(bytes(_description).length > 0, "Enter a valid description");
        videos[videoCount] = Video(
            payable(msg.sender),
            _title,
            _url,
            _poster,
            _description,
            0,
            0
        );
        videoCount = videoCount.add(1);
    }

    // get a certain video
    function getVideo(uint _index) public view returns (
        address payable,
        string memory, 
        string memory, 
        string memory,
        string memory,
        uint,
        uint
    ) {
        require(videos[_index].owner != address (0), "this video does not exist");
        return (
            videos[_index].owner,
            videos[_index].title,
            videos[_index].url,
            videos[_index].poster,
            videos[_index].description,
            videos[_index].raised,
            videos[_index].supporters
        );
    }
    
    // support video
    function supportVideo(uint _index, uint _amount) notOwner(_index) public payable  {
        require(videos[_index].owner != address (0), "this video does not exist");
        require(
                IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                videos[_index].owner,
                _amount), "Transfer failed."
            );

        videos[_index].supporters.add(1);
        videos[_index].raised.add(_amount);
    }
    
    // get number of videos
    function getVideoCount() public view returns (uint) {
        return (videoCount);
    }
    
    // edit video parameters
    function editVideo(
        uint _index,
        string memory _title,
        string memory _url,
        string memory _poster,
        string memory _description
    ) onlyOwner(_index) public {
        videos[_index].title = _title;
        videos[_index].url = _url;
        videos[_index].poster = _poster;
        videos[_index].description = _description;
    }
    
    // transfer ownership to another address
    function transferOwner(uint _index, address _newOwner) onlyOwner(_index) public {
         require(_newOwner != address(0), "new owner cannot be the zero address");

        videos[_index].owner = payable(_newOwner);
    }
}
