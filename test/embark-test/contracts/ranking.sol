pragma solidity ^0.5.0;

contract Ranking {

  mapping(address => uint[]) public rating;

  event Rating(address sender, address addr, uint rating);

  function rate(address _addr, uint _rate) external {
    require(_rate >= 1, "Rating needs to be at least 1");
    require(_rate <= 5, "Rating needs to be at less than or equal to 5");

    rating[msg.sender].push(_rate);

    emit Rating(msg.sender, _addr, _rate);
  }
}
