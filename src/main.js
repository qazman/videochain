import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import erc20Abi from "../contract/erc20.abi.json";
import VideoChainAbi from "../contract/videoChain.abi.json";
require("arrive");

const ERC20_DECIMALS = 18;
const cUSDContractAddress = "0xb053651858F145b3127504C1045a1FEf8976BFfB";
const VideoChainContractAddressAbi = "0x2789a773F022C5F1FF6B6a73FdDB40b55a69165A";

let kit;
let contract;
let videos = [];

const connectCeloWallet = async function () {
  console.log("connecting celo");
  if (window.celo) {
    try {
      notification("⚠️ Please approve this DApp to connect to your wallet.");
      await window.celo.enable();
      notificationOff();
      const web3 = new Web3(window.celo);
      kit = newKitFromWeb3(web3);

      const accounts = await kit.web3.eth.getAccounts();
      kit.defaultAccount = accounts[0];

      contract = new kit.web3.eth.Contract(VideoChainAbi, VideoChainContractAddressAbi);
    } catch (error) {
      notification(`⚠️ ${error}.`);
    }
  } else {
    notification("⚠️ Please install the CeloExtensionWallet.");
  }
};

async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress);

  const result = await cUSDContract.methods
    .approve(VideoChainContractAddressAbi, _price)
    .send({ from: kit.defaultAccount });
  return result;
}

const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount);
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);
  document.getElementById("balance").innerHTML = cUSDBalance;
  return cUSDBalance;
};

document.querySelector("#newVideoBtn").addEventListener("click", async (e) => {
  const params = [
    document.getElementById("newTitle").value,
    document.getElementById("newVideoURL").value,
    document.getElementById("newPoster").value,
    document.getElementById("newDescription").value,
  ];

  notification(`⌛ Adding "${params[0]}"...`);
  try {
    const result = await contract.methods
      .uploadVideo(...params)
      .send({ from: kit.defaultAccount });
  } catch (error) {
    notification(`⚠️ ${error}.`);
  }
  notification(`🎉 You successfully added "${params[0]}".`);
  getVideos();
});

async function supportVideo(index) {
  const amount = new BigNumber(
    document.getElementById(`supportAmount${index}`).value
  )
    .shiftedBy(ERC20_DECIMALS)
    .toString();

  const params = [index, amount];

  notification("⌛ Waiting for payment approval...");
  try {
    await approve(amount);
  } catch (error) {
    notification(`⚠️ ${error}.`);
    console.log(error);
  }

  notification(`⌛ Awaiting payment for "${videos[index].title}"...`);

  try {
    const result = await contract.methods
      .supportVideo(...params)
      .send({ from: kit.defaultAccount });

    notification(`🎉 You successfully supported "${videos[index].title}".`);

    getVideos();
    getBalance();
  } catch (error) {
    notification(`⚠️ ${error}.`);
  }
}

const getVideos = async function () {
  const _videosCount = await contract.methods.getVideoCount().call();
  const _videos = [];

  for (let i = 0; i < _videosCount; i++) {
    let _video = new Promise(async (resolve, reject) => {
      let video = await contract.methods.getVideo(i).call();

      resolve({
        index: i,
        owner: video[0],
        title: video[1],
        url: video[2],
        poster: video[3],
        description: video[4],
        raised: new BigNumber(video[5]),
        supporters: video[6],
      });
    });

    _videos.push(_video);
  }

  videos = await Promise.all(_videos);

  renderVideos();
};

function renderVideos() {
  document.getElementById("videoList").innerHTML = "";

  videos.forEach((_video) => {
    const newDiv = document.createElement("div");
    newDiv.className = "col-md-4";
    newDiv.innerHTML = `
          ${videoTemplate(_video)}
          <div class="videoTemplates">
          </div>`;

    document.getElementById("videoList").appendChild(newDiv);
  });
}

function notification(_text) {
  document.querySelector(".alert").style.display = "block";
  document.querySelector("#notification").textContent = _text;
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none";
}

function videoTemplate(_video) {
  return `
    <div class="card mb-4 mx-2 videoTemplate" >
    <video class="card-img-top" src="${_video.url}" alt="..." poster="${_video.poster}" controls></video>
    <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
    ${_video.supporters} Supporters ⚓️
    </div>
      <div class="card-body text-left  position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_video.owner)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_video.title}</h2>
        <p class="card-text " style="">
          Raised <b>${_video.raised
            .shiftedBy(-ERC20_DECIMALS)
            .toFixed(4)}</b>        
        </p>
        <p class="card-text mb-4" >
        by ${_video.owner}
        </p>

        <p class="card-text mb-4" >
       ${_video.description}
        </p>

        <button class="btn btn-lg btn-outline-dark bg-success fs-6 p-3" id=${
          _video.index
        }
          
          data-bs-toggle="modal"
          data-bs-target="#supportModal${_video.index}"
        >
          <b>Support</b> this
        </button>

        <!--Modal-->
        ${supportModal(_video.index)}
        <!--/Modal-->

      </div>
    </div>
  `;
}

let hasArrived = false;

window.addEventListener("load", async () => {

  document.arrive(".videoTemplates", () => {
    
    if (!hasArrived) {
      hasArrived = true;

      const supportBtns = document.querySelectorAll("aroja");

      supportBtns.forEach((supportBtn) => {

        supportBtn.addEventListener("click", async () => {
          
          const index = supportBtn.getAttribute("index-value");

          await supportVideo(parseInt(index));
        });
      });
    }
  });
});

function supportModal(_index) {
  return `
    <div
      class="modal fade supportModal"
      id="supportModal${_index}"
      tabindex="-1"
      aria-labelledby="supportModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title" id="supportModalLabel">Support</h5>
            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <form>
              <div class="form-row">
                <div class="col">
                  <input
                    type="text"
                    id="supportAmount${_index}"
                    class="form-control mb-2 "
                    placeholder="Support in cUSD"
                  />
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-light border"
              data-bs-dismiss="modal"
            >
              Close
            </button>
            <button
              type="button"
              class="btn btn-dark supportBtn aroja"
              data-bs-dismiss="modal"
              index-value="${_index}"
            >
              Thanks, Lets go! 🚀
            </button>
          </div>
        </div>
      </div>  
    </div>     
  `;
}

function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL();

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `;
}

window.addEventListener("load", async () => {
  notification("⌛ Loading...");
  await connectCeloWallet();
  await getBalance();
  await getVideos();
  notificationOff();
});
