import unitoken from '../uniswap_token.json'
import * as ethers from 'ethers'
import * as dotenv from 'dotenv'
import { BigNumber } from '@ethersproject/bignumber'
dotenv.config()

const spender = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' // Uniswap's router02 on goerli
const uniswapToken = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' // Uniswap on goerli
const deadline = ethers.constants.MaxUint256

;(async () => {
    const provider = new ethers.providers.InfuraProvider(
        process.env.INFURA_NETWORK,
        process.env.INFURA_API_KEY
    )
    const signerWallet = new ethers.Wallet(process.env.PRIV, provider)

    // connect wallet with provider to solve "Error: API provider does not support signing"
    // https://stackoverflow.com/a/69157542/1931060
    const signer = signerWallet.connect(provider)
    const uniswapContract = new ethers.Contract(uniswapToken, unitoken, signer)

    const nonce = (
        await uniswapContract.functions.nonces(signerWallet.address)
    )[0].toNumber()

    try {
        const typedData = {
            owner: signerWallet.address,
            spender,
            value: BigNumber.from('1000000000000000'), // 0.01 UNI
            nonce,
            deadline,
        }

        const sig = await signerWallet._signTypedData(
            {
                name: 'Uniswap',
                chainId: await signerWallet.getChainId(),
                // no "version" needed for Uniswap contract
                verifyingContract: uniswapToken,
            },
            {
                Permit: [
                    {
                        name: 'owner',
                        type: 'address',
                    },
                    {
                        name: 'spender',
                        type: 'address',
                    },
                    {
                        name: 'value',
                        type: 'uint256',
                    },
                    {
                        name: 'nonce',
                        type: 'uint256',
                    },
                    {
                        name: 'deadline',
                        type: 'uint256',
                    },
                ],
            },
            typedData
        )

        const { r, s, v } = ethers.utils.splitSignature(sig)
        await uniswapContract.functions.permit(
            // relays
            signerWallet.address,
            spender,
            typedData.value,
            deadline,
            v,
            r,
            s
        )
    } catch (err) {
        console.log(err)
    }
})()
