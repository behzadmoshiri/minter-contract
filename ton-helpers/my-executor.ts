import BN from "bn.js";
import { Address, Cell, Slice, TonClient, contractAddress, beginCell } from "ton";
import { addressToCell } from "../test/deploy-controller.spec";

interface Executor {
  invokeGetMethod(methodName: string, params?: any[]): Promise<(BN | Cell)[]>;
}

// interface CallableGetMethod {

//     get()

// }

// class TheContract {

// }

// class JettonMinterGetJettonDetails implements CallableGetMethod {

//     parse() {

//     }

//     async get() {

//     }

// }

export class TonClientExecutor implements Executor {
  #tonClient: TonClient;
  #contractAddress: Address;

  constructor(tonClient: TonClient, contractAddress: Address) {
    this.#tonClient = tonClient;
    this.#contractAddress = contractAddress;
  }

  #parseGetMethodCall(stack: any[]) {
    return stack.map(([type, val]) => {
      switch (type) {
        case "num":
          return new BN(val.replace("0x", ""), "hex");
        case "cell":
          return Cell.fromBoc(Buffer.from(val.bytes, "base64"))[0];
        default:
          throw new Error("unknown type");
      }
    });
  }

  #prepareParams(params: any[] = []) {
    return params.map((p) => {
      if (p instanceof Cell) {
        // TODO what's idx:false
        return ["tvm.Slice", p.toBoc({ idx: false }).toString("base64")];
      }

      throw new Error("unknown type!");
    });
  }

  async invokeGetMethod(methodName: string, params?: any[]): Promise<(BN | Cell)[]> {
    const res = await this.#tonClient.callGetMethod(this.#contractAddress, methodName, this.#prepareParams(params));
    return this.#parseGetMethodCall(res.stack);
  }
}


interface JettonDetails {
  totalSupply: BN;
  address: Address;
  contentUri: string;
}

class ZContract {
  protected executor: Executor;
  constructor(executor: Executor) {
    this.executor = executor;
  }
}

export class JettonMinterContract extends ZContract {
  async getJettonDetails(): Promise<JettonDetails> {
    const res = await this.executor.invokeGetMethod("get_jetton_details");
    const contentUriSlice = (res[3] as Cell).beginParse(); // TODO support onchain
    contentUriSlice.readInt(8);

    return {
      totalSupply: res[0] as BN,
      address: (res[2] as Cell).beginParse().readAddress() as Address,
      contentUri: contentUriSlice.readRemainingBytes().toString("ascii"),
    };
  }

  async getJWalletAddress(forOwner: Address): Promise<Address> {
    const res = await this.executor.invokeGetMethod("get_wallet_address", [addressToCell(forOwner)]);
    return (res[0] as Cell).beginParse().readAddress() as Address;
  }
}

interface JWalletData {
  balance: BN
}

export class JettonWalletContract extends ZContract {
  async getWalletData(): Promise<JWalletData> {
    const res = await this.executor.invokeGetMethod("get_wallet_data");
    return {
      balance: (res[0] as BN)
    };
  }
}



// new TonClientExecutor().invokeGetMethod("", "", [], new JettonDetailsParser());

// class TestClientExecutor implements Executor {
//   constructor(tonClient: TonClient) {
//     this.#tonClient = tonClient;
//   }

//   parseGetMethodCall(stack: any[]) {
//     return stack.map(([type, val]) => {
//       switch (type) {
//         case "num":
//           return new BN(val.replace("0x", ""), "hex");
//         case "cell":
//           return Cell.fromBoc(Buffer.from(val.bytes, "base64"))[0];
//         default:
//           throw new Error("unknown type");
//       }
//     });
//   }

//   async invokeGetMethod(contractAddress: Address, methodName: string, params: any[]): Promise<(BN | Cell)[]> {
//     const res = await this.#tonClient.callGetMethod(contractAddress, methodName, params);
//     return this.parseGetMethodCall(res.stack);
//   }
// }